import { createSign } from "node:crypto";

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, QueueEvents, UnrecoverableError, Worker } from "bullmq";
import IORedis from "ioredis";

import { sendSmscSms } from "./smsc.provider";

export type NotificationType =
  | "auth_otp"
  | "executor_incoming_order"
  | "order_accepted"
  | "order_arriving"
  | "order_waiting"
  | "order_started"
  | "order_completed"
  | "order_cancelled"
  | "delivery_picked_up"
  | "delivery_at_door"
  | "delivery_completed"
  | "delivery_failed"
  | "balance_topup_invoiced"
  | "balance_topup_confirmed"
  | "balance_topup_rejected";

export type NotificationLanguage = "ru" | "kk";
export type NotificationChannel = "push" | "sms";

const driverOrdersChannelId = "dos_driver_orders_v3";
const orderAlertsChannelId = "dos_order_alerts_v1";
const orderUpdatesChannelId = "dos_order_updates_v1";

export type BufferedNotification = {
  channel: NotificationChannel;
  target: string;
  type: NotificationType;
  lang: NotificationLanguage;
  subject: string | null;
  body: string;
  provider: string;
  providerMessageId?: number;
};

type PushNotificationJob = {
  channel: "push";
  token: string;
  subject: string | null;
  body: string;
  type: NotificationType;
  lang: NotificationLanguage;
  data?: Record<string, string>;
};

type SmsNotificationJob = {
  channel: "sms";
  phone: string;
  subject: string | null;
  body: string;
  type: NotificationType;
  lang: NotificationLanguage;
  expiresAt?: number;
};

type NotificationJobPayload = PushNotificationJob | SmsNotificationJob;
type InvalidPushTokenHandler = (token: string) => Promise<void>;

@Injectable()
export class NotificationsQueueService
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(NotificationsQueueService.name);
  private readonly bufferedNotifications: BufferedNotification[] = [];
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private queue: Queue<NotificationJobPayload> | null = null;
  private worker: Worker<NotificationJobPayload> | null = null;
  private queueEvents: QueueEvents | null = null;
  private connection: IORedis | null = null;
  private pushAccessToken: {
    token: string;
    expiresAt: number;
  } | null = null;
  private invalidPushTokenHandler: InvalidPushTokenHandler | null = null;

  setInvalidPushTokenHandler(handler: InvalidPushTokenHandler): void {
    this.invalidPushTokenHandler = handler;
  }

  async onModuleInit(): Promise<void> {
    const redisUrl =
      this.configService.get<string>("redisUrl") ??
      this.configService.get<string>("REDIS_URL");
    if (!redisUrl) {
      return;
    }

    try {
      this.connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      this.queue = new Queue<NotificationJobPayload>("notifications-queue", {
        connection: this.connection,
      });
      if (this.isLiveSmscEnabled()) {
        this.queueEvents = new QueueEvents("notifications-queue", {
          connection: this.connection,
        });
      }
      this.worker = new Worker<NotificationJobPayload>(
        "notifications-queue",
        async (job) => this.processJob(job),
        {
          connection: this.connection,
        },
      );
    } catch {
      this.logger.warn("Notifications queue fell back to in-memory scheduling");
      await this.worker?.close();
      await this.queueEvents?.close();
      await this.queue?.close();
      await this.connection?.quit();
      this.connection = null;
      this.queue = null;
      this.worker = null;
      this.queueEvents = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    await this.worker?.close();
    await this.queueEvents?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueuePush(job: Omit<PushNotificationJob, "channel">): Promise<void> {
    await this.enqueue({
      ...job,
      channel: "push",
    });
  }

  async enqueueSms(job: Omit<SmsNotificationJob, "channel">): Promise<void> {
    if (this.isLiveSmscEnabled()) {
      if (!this.queue || !this.queueEvents) {
        throw new Error(
          "Redis notifications queue is required for SMSC delivery",
        );
      }
      await this.queueEvents.waitUntilReady();
      const queued = await this.queue.add(
        "notification-sms",
        {
          ...job,
          channel: "sms",
          expiresAt:
            job.type === "auth_otp"
              ? Date.now() +
                Number(this.configService.get("OTP_TTL_SECONDS") ?? 300) * 1000
              : undefined,
        },
        {
          // Automatic retries after an ambiguous timeout can bill duplicate SMS.
          attempts: 1,
          removeOnComplete: { age: 300, count: 100 },
          removeOnFail: { age: 300, count: 100 },
        },
      );
      try {
        // Delivery runs in the worker; OTP HTTP returns success only on acceptance.
        await queued.waitUntilFinished(this.queueEvents, 20_000);
      } catch (error) {
        // Remove a waiting job so a timed-out OTP is not sent later.
        await queued.remove().catch(() => undefined);
        throw error;
      }
      return;
    }
    if (this.shouldDeliverSmsSynchronously()) {
      await this.deliverSms({
        ...job,
        channel: "sms",
      });
      return;
    }

    await this.enqueue({
      ...job,
      channel: "sms",
    });
  }

  getBufferedNotifications(): BufferedNotification[] {
    return [...this.bufferedNotifications];
  }

  private async enqueue(job: NotificationJobPayload): Promise<void> {
    if (this.queue) {
      await this.queue.add(`notification-${job.channel}`, job);
      return;
    }

    this.scheduleInMemory(() => this.processPayload(job));
  }

  private async processJob(job: Job<NotificationJobPayload>): Promise<void> {
    await this.processPayload(job.data);
  }

  private async processPayload(job: NotificationJobPayload): Promise<void> {
    try {
      if (job.channel === "push") {
        await this.deliverPush(job);
        return;
      }

      await this.deliverSms(job);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown notification error";
      this.logger.warn(
        `Failed to process ${job.channel} notification ${job.type}: ${message}`,
      );
      if (job.channel === "push" && this.isInvalidPushTokenError(message)) {
        await this.invalidPushTokenHandler?.(job.token);
      }
      if (job.channel === "sms" && this.isLiveSmscEnabled()) {
        throw new UnrecoverableError(message);
      }
    }
  }

  private async deliverPush(job: PushNotificationJob): Promise<void> {
    const pushStubEnabled =
      this.configService.get<string>("NOTIFICATIONS_PUSH_STUB") === "true";
    const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.configService.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.configService.get<string>("FIREBASE_PRIVATE_KEY");

    if (pushStubEnabled || !projectId) {
      this.recordBufferedNotification({
        channel: "push",
        target: job.token,
        type: job.type,
        lang: job.lang,
        subject: job.subject,
        body: job.body,
        provider: "stub",
      });
      this.logger.debug(`push:${job.type} -> ${job.token} ${job.body}`);
      return;
    }

    const accessToken =
      clientEmail && privateKey
        ? await this.getFirebaseAccessToken(clientEmail, privateKey)
        : await this.getFirebaseMetadataAccessToken();
    if (!accessToken) {
      this.recordBufferedNotification({
        channel: "push",
        target: job.token,
        type: job.type,
        lang: job.lang,
        subject: job.subject,
        body: job.body,
        provider: "stub",
      });
      return;
    }

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: job.token,
            notification: {
              title: job.subject ?? "",
              body: job.body,
            },
            data: {
              ...(job.data ?? {}),
              channelId: this.androidChannelIdFor(job.type),
              sound: "default",
            },
            android: {
              priority: "high",
              notification: {
                channel_id: this.androidChannelIdFor(job.type),
                sound: "default",
                default_sound: true,
              },
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
              payload: {
                aps: {
                  sound: "default",
                },
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `FCM delivery failed with status ${response.status}: ${errorText}`,
      );
    }

    this.recordBufferedNotification({
      channel: "push",
      target: job.token,
      type: job.type,
      lang: job.lang,
      subject: job.subject,
      body: job.body,
      provider: "fcm",
    });
  }

  private async deliverSms(job: SmsNotificationJob): Promise<void> {
    const smsStubEnabled =
      this.configService.get<string>("NOTIFICATIONS_SMS_STUB") === "true";
    const provider =
      this.configService
        .get<string>("NOTIFICATIONS_SMS_PROVIDER")
        ?.toLowerCase() ??
      this.configService.get<string>("SMS_PROVIDER")?.toLowerCase() ??
      "stub";

    if (smsStubEnabled || provider === "stub") {
      this.recordBufferedNotification({
        channel: "sms",
        target: job.phone,
        type: job.type,
        lang: job.lang,
        subject: job.subject,
        body: job.body,
        provider: "stub",
      });
      this.logger.debug(`sms:${job.type} -> ${job.phone} ${job.body}`);
      return;
    }

    if (provider === "wappi") {
      await this.deliverWappiMessage(job);
      return;
    }

    if (provider === "smsc") {
      if (job.expiresAt !== undefined && job.expiresAt <= Date.now()) {
        throw new Error("OTP expired before SMSC delivery");
      }
      const result = await sendSmscSms(this.configService, job.phone, job.body);
      this.recordBufferedNotification({
        channel: "sms",
        target: job.phone,
        type: job.type,
        lang: job.lang,
        subject: job.subject,
        body: job.type === "auth_otp" ? "[redacted OTP]" : job.body,
        provider: "smsc",
        providerMessageId: result.id,
      });
      this.logger.log(
        `smsc:${job.type} -> ${this.maskPhone(job.phone)} accepted id=${result.id}`,
      );
      return;
    }

    const providerUrl = this.configService.get<string>(
      "NOTIFICATIONS_SMS_PROVIDER_URL",
    );
    const providerToken = this.configService.get<string>(
      "NOTIFICATIONS_SMS_PROVIDER_TOKEN",
    );

    if (!providerUrl) {
      throw new Error("SMS provider URL is required for non-stub delivery");
    }

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(providerToken
          ? {
              Authorization: `Bearer ${providerToken}`,
            }
          : {}),
      },
      body: JSON.stringify({
        phone: job.phone,
        text: job.body,
        subject: job.subject,
        type: job.type,
        lang: job.lang,
        provider,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SMS delivery failed with status ${response.status}: ${errorText}`,
      );
    }

    this.recordBufferedNotification({
      channel: "sms",
      target: job.phone,
      type: job.type,
      lang: job.lang,
      subject: job.subject,
      body: job.body,
      provider,
    });
  }

  private async deliverWappiMessage(job: SmsNotificationJob): Promise<void> {
    const token = this.configService.get<string>("WAPPI_TOKEN");
    const profileId = this.configService.get<string>("WAPPI_PROFILE_ID");

    if (!token || !profileId) {
      throw new Error("WAPPI_TOKEN and WAPPI_PROFILE_ID are required");
    }

    const baseUrl =
      this.configService.get<string>("WAPPI_API_BASE_URL") ??
      "https://wappi.pro";
    const botId = this.configService.get<string>("WAPPI_BOT_ID") ?? "dos-taxi";
    const url = new URL("/api/sync/message/send", baseUrl);
    url.searchParams.set("profile_id", profileId);
    url.searchParams.set("bot_id", botId);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: this.normalizeWappiRecipient(job.phone),
        body: job.subject ? `${job.subject}\n${job.body}` : job.body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Wappi delivery failed with status ${response.status}: ${errorText}`,
      );
    }

    this.recordBufferedNotification({
      channel: "sms",
      target: job.phone,
      type: job.type,
      lang: job.lang,
      subject: job.subject,
      body: job.body,
      provider: "wappi",
    });
    this.logger.log(`wappi:${job.type} -> ${this.maskPhone(job.phone)}`);
  }

  private shouldDeliverSmsSynchronously(): boolean {
    const smsStubEnabled =
      this.configService.get<string>("NOTIFICATIONS_SMS_STUB") === "true";
    const provider =
      this.configService
        .get<string>("NOTIFICATIONS_SMS_PROVIDER")
        ?.toLowerCase() ??
      this.configService.get<string>("SMS_PROVIDER")?.toLowerCase() ??
      "stub";

    return !smsStubEnabled && provider === "wappi";
  }

  private isLiveSmscEnabled(): boolean {
    return (
      this.configService.get<string>("NOTIFICATIONS_SMS_STUB") !== "true" &&
      this.configService
        .get<string>("NOTIFICATIONS_SMS_PROVIDER")
        ?.toLowerCase() === "smsc"
    );
  }

  private normalizeWappiRecipient(phone: string): string {
    const digits = phone.replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("8")) {
      return `7${digits.slice(1)}`;
    }

    return digits;
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    const visibleTail = digits.slice(-4);
    return `***${visibleTail}`;
  }

  private recordBufferedNotification(notification: BufferedNotification): void {
    this.bufferedNotifications.push(notification);
  }

  private scheduleInMemory(handler: () => Promise<void>): void {
    const timer = setTimeout(() => {
      void handler().finally(() => {
        this.timers.delete(timer);
      });
    }, 0);
    this.timers.add(timer);
  }

  private androidChannelIdFor(type: NotificationType): string {
    if (type === "executor_incoming_order") {
      return driverOrdersChannelId;
    }

    if (
      type === "order_waiting" ||
      type === "order_started" ||
      type === "order_cancelled"
    ) {
      return orderAlertsChannelId;
    }

    return orderUpdatesChannelId;
  }

  private isInvalidPushTokenError(message: string): boolean {
    return (
      message.includes("NotRegistered") ||
      message.includes("UNREGISTERED") ||
      message.includes("registration-token-not-registered")
    );
  }

  private async getFirebaseAccessToken(
    clientEmail: string,
    privateKey: string,
  ): Promise<string | null> {
    if (
      this.pushAccessToken &&
      this.pushAccessToken.expiresAt > Date.now() + 60_000
    ) {
      return this.pushAccessToken.token;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = this.base64UrlEncode({
      alg: "RS256",
      typ: "JWT",
    });
    const claims = this.base64UrlEncode({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });

    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    signer.end();

    const assertion = `${header}.${claims}.${signer.sign(
      privateKey.replace(/\\n/g, "\n"),
      "base64url",
    )}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(`FCM auth token request failed: ${errorText}`);
      return null;
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      return null;
    }

    this.pushAccessToken = {
      token: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    };

    return payload.access_token;
  }

  private async getFirebaseMetadataAccessToken(): Promise<string | null> {
    if (
      this.pushAccessToken &&
      this.pushAccessToken.expiresAt > Date.now() + 60_000
    ) {
      return this.pushAccessToken.token;
    }

    const response = await fetch(
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/firebase.messaging",
      {
        headers: {
          "Metadata-Flavor": "Google",
        },
      },
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.warn(`FCM metadata token request failed: ${message}`);
      return null;
    });

    if (!response) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(`FCM metadata token request failed: ${errorText}`);
      return null;
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      return null;
    }

    this.pushAccessToken = {
      token: payload.access_token,
      expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    };

    return payload.access_token;
  }

  private base64UrlEncode(value: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  }
}

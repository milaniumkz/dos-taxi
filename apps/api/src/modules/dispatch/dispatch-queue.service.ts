import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { DispatchService } from "./dispatch.service";

type DispatchJobPayload = {
  orderId: string;
  offerId?: string;
};

@Injectable()
export class DispatchQueueService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatchService: DispatchService,
  ) {}

  private readonly logger = new Logger(DispatchQueueService.name);
  private queue: Queue<DispatchJobPayload> | null = null;
  private worker: Worker<DispatchJobPayload> | null = null;
  private connection: IORedis | null = null;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

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
      this.queue = new Queue<DispatchJobPayload>("dispatch-queue", {
        connection: this.connection,
      });
      this.worker = new Worker<DispatchJobPayload>(
        "dispatch-queue",
        async (job) => this.processJob(job),
        {
          connection: this.connection,
        },
      );
      this.worker.on("failed", (job, error) => {
        this.logger.error(
          `Dispatch job ${job?.name ?? "unknown"} failed: ${error.message}`,
        );
      });
      this.logger.log("Dispatch queue is connected");
    } catch {
      this.logger.warn("Dispatch queue fell back to in-memory scheduling");
      await this.connection?.quit();
      this.connection = null;
      this.queue = null;
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueueDispatchOrder(orderId: string): Promise<void> {
    await this.dispatchService.findAndAssign(orderId);
  }

  async scheduleOfferTimeout(
    orderId: string,
    offerId: string,
    delayMs: number,
  ): Promise<void> {
    if (this.queue) {
      await this.queue.add(
        "offer-timeout",
        { orderId, offerId },
        {
          delay: delayMs,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      return;
    }

    this.scheduleInMemory(delayMs, () =>
      this.dispatchService.handleOfferTimeout(orderId, offerId),
    );
  }

  async scheduleRetry(orderId: string, delayMs: number): Promise<void> {
    if (this.queue) {
      await this.queue.add(
        "dispatch-retry",
        { orderId },
        {
          delay: delayMs,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
      return;
    }

    this.scheduleInMemory(delayMs, () =>
      this.dispatchService.retryDispatch(orderId),
    );
  }

  private async processJob(job: Job<DispatchJobPayload>): Promise<void> {
    switch (job.name) {
      case "dispatch-order":
        await this.dispatchService.findAndAssign(job.data.orderId);
        return;
      case "offer-timeout":
        if (job.data.offerId) {
          await this.dispatchService.handleOfferTimeout(
            job.data.orderId,
            job.data.offerId,
          );
        }
        return;
      case "dispatch-retry":
        await this.dispatchService.retryDispatch(job.data.orderId);
        return;
      default:
        return;
    }
  }

  private scheduleInMemory(
    delayMs: number,
    handler: () => Promise<void>,
  ): void {
    const timer = setTimeout(() => {
      void handler().finally(() => {
        this.timers.delete(timer);
      });
    }, delayMs);
    this.timers.add(timer);
  }
}

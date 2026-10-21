import { ExecutorEntity } from "../executors/entities/executor.entity";
import { UserRole } from "@dos/shared-types";
import { ConflictException, Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { AdminActivityLogEntity } from "../admin/entities/admin-activity-log.entity";
import { UserEntity } from "../users/entities/user.entity";
import { PushCampaignDto } from "./dto/push-campaign.dto";
import { NotificationDeviceTokenEntity } from "./entities/notification-device-token.entity";
import { PushCampaignEntity } from "./entities/push-campaign.entity";
import { NotificationsQueueService } from "./notifications-queue.service";

@Injectable()
export class AdminPushService {
  constructor(
    private readonly db: DataSource,
    private readonly queue: NotificationsQueueService,
  ) {}

  private recipients(manager: EntityManager, audience: string) {
    const query = manager
      .getRepository(NotificationDeviceTokenEntity)
      .createQueryBuilder("device")
      .innerJoin(UserEntity, "recipient", "recipient.id=device.user_id")
      .leftJoin(ExecutorEntity, "executor", "executor.user_id=device.user_id")
      .where("device.is_active=true AND recipient.is_blocked=false")
      .andWhere(
        "COALESCE(device.role, CASE WHEN executor.id IS NULL THEN 'client' ELSE 'executor' END) IN (:...roles)",
        {
          roles:
            audience === "passenger"
              ? [UserRole.CLIENT]
              : audience === "driver"
                ? [UserRole.EXECUTOR]
                : [UserRole.CLIENT, UserRole.EXECUTOR],
        },
      );
    return query;
  }
  async list() {
    const [items, passenger, driver, all] = await Promise.all([
      this.db
        .getRepository(PushCampaignEntity)
        .find({ order: { createdAt: "DESC" }, take: 30 }),
      this.recipients(this.db.manager, "passenger").getCount(),
      this.recipients(this.db.manager, "driver").getCount(),
      this.recipients(this.db.manager, "all").getCount(),
    ]);
    return { items, devices: { passenger, driver, all } };
  }
  async send(actorId: string, dto: PushCampaignDto) {
    const actor = await this.db
      .getRepository(UserEntity)
      .findOneBy({ id: actorId });
    // Keep the immutable message even when queueing is interrupted. Retrying the
    // same campaign reuses per-device BullMQ IDs instead of creating duplicates.
    await this.db
      .getRepository(PushCampaignEntity)
      .createQueryBuilder()
      .insert()
      .values({
        id: dto.id,
        title: dto.title.trim(),
        body: dto.body.trim(),
        audience: dto.audience,
        actorId: actor?.id ?? null,
        status: "processing",
        queuedDevices: 0,
      })
      .orIgnore()
      .execute();
    return this.db.transaction(async (manager) => {
      // Only one request may queue a given campaign at a time.
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [dto.id],
      );
      const repository = manager.getRepository(PushCampaignEntity);
      const campaign = await repository.findOneByOrFail({ id: dto.id });
      if (
        campaign.title !== dto.title.trim() ||
        campaign.body !== dto.body.trim() ||
        campaign.audience !== dto.audience
      )
        throw new ConflictException("PUSH_REQUEST_KEY_REUSED");
      if (campaign.status === "queued") return campaign;
      campaign.queuedDevices = 0;
      let cursor: string | undefined;
      while (true) {
        const query = this.recipients(manager, dto.audience)
          .orderBy("device.id", "ASC")
          .take(200);
        if (cursor) query.andWhere("device.id>:cursor", { cursor });
        const devices = await query.getMany();
        if (!devices.length) break;
        for (const device of devices) {
          await this.queue.enqueuePush(
            {
              token: device.token,
              subject: campaign.title,
              body: campaign.body,
              type: "admin_broadcast",
              lang: "ru",
              data: { type: "admin_broadcast", campaignId: dto.id },
            },
            `admin-${dto.id}-${device.id}`,
          );
          campaign.queuedDevices++;
        }
        cursor = devices[devices.length - 1].id;
      }
      campaign.status = "queued";
      await repository.save(campaign);
      await manager.getRepository(AdminActivityLogEntity).save({
        actorId: actor?.id ?? null,
        action: "push.campaign.queued",
        entityType: "settings",
        entityId: dto.id,
        metadata: {
          audience: dto.audience,
          queuedDevices: campaign.queuedDevices,
          title: campaign.title,
        },
      });
      return campaign;
    });
  }
}

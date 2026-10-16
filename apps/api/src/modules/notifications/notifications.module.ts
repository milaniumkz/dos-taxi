import { AdminPushController } from "./admin-push.controller";
import { AdminPushService } from "./admin-push.service";
import { PushCampaignEntity } from "./entities/push-campaign.entity";
import { NotificationDevicesController } from "./notification-devices.controller";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserEntity } from "../users/entities/user.entity";

import { NotificationDeviceTokenEntity } from "./entities/notification-device-token.entity";
import { NotificationTemplateEntity } from "./entities/notification-template.entity";
import { NotificationTemplateRenderer } from "./notification-template.renderer";
import { NotificationsQueueService } from "./notifications-queue.service";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PushCampaignEntity,
      UserEntity,
      NotificationTemplateEntity,
      NotificationDeviceTokenEntity,
    ]),
  ],
  controllers: [NotificationDevicesController, AdminPushController],
  providers: [
    AdminPushService,
    NotificationTemplateRenderer,
    NotificationsQueueService,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

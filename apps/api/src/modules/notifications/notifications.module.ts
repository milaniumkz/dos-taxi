import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../users/entities/user.entity';

import { NotificationDeviceTokenEntity } from './entities/notification-device-token.entity';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplateRenderer } from './notification-template.renderer';
import { NotificationsQueueService } from './notifications-queue.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      NotificationTemplateEntity,
      NotificationDeviceTokenEntity,
    ]),
  ],
  providers: [
    NotificationTemplateRenderer,
    NotificationsQueueService,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

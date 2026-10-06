import { UserRole } from '@dos/shared-types';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserEntity } from '../users/entities/user.entity';

import { NotificationDeviceTokenEntity } from './entities/notification-device-token.entity';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplateRenderer } from './notification-template.renderer';
import {
  BufferedNotification,
  NotificationLanguage,
  NotificationsQueueService,
  NotificationType,
} from './notifications-queue.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(NotificationTemplateEntity)
    private readonly templatesRepository: Repository<NotificationTemplateEntity>,
    @InjectRepository(NotificationDeviceTokenEntity)
    private readonly deviceTokensRepository: Repository<NotificationDeviceTokenEntity>,
    private readonly templateRenderer: NotificationTemplateRenderer,
    private readonly notificationsQueueService: NotificationsQueueService,
  ) {
    this.notificationsQueueService.setInvalidPushTokenHandler((token) =>
      this.deactivateDeviceToken(token),
    );
  }

  async send(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    lang: NotificationLanguage = 'ru',
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      return;
    }

    const [templates, deviceTokens] = await Promise.all([
      this.templatesRepository.find({
        where: {
          type,
          lang,
          isActive: true,
        },
      }),
      this.deviceTokensRepository.find({
        where: {
          userId,
          isActive: true,
        },
        order: {
          updatedAt: 'DESC',
        },
      }),
    ]);

    const pushTemplates = templates.filter((template) => template.channel === 'push');
    const serializedPayload = this.serializePayload(type, payload);

    if (deviceTokens.length === 0 || pushTemplates.length === 0) {
      return;
    }

    for (const template of pushTemplates) {
      const body = this.templateRenderer.render(template.body, payload);
      const subject = template.subject
        ? this.templateRenderer.render(template.subject, payload)
        : null;

      for (const deviceToken of deviceTokens) {
        await this.notificationsQueueService.enqueuePush({
          token: deviceToken.token,
          subject,
          body,
          type,
          lang,
          data: serializedPayload,
        });
      }
    }
  }

  async sendSms(
    phone: string,
    type: NotificationType,
    payload: Record<string, unknown>,
    lang: NotificationLanguage = 'ru',
  ): Promise<void> {
    if (type !== 'auth_otp') {
      return;
    }

    const templates = await this.templatesRepository.find({
      where: {
        type,
        channel: 'sms',
        lang,
        isActive: true,
      },
    });

    if (templates.length === 0) {
      throw new ServiceUnavailableException("Active OTP SMS template is missing");
    }

    for (const template of templates) {
      const body = this.templateRenderer.render(template.body, payload);
      const subject = template.subject
        ? this.templateRenderer.render(template.subject, payload)
        : null;

      await this.notificationsQueueService.enqueueSms({
        phone,
        subject,
        body,
        type,
        lang,
      });
    }
  }

  async registerDeviceToken(
    userId: string,
    token: string,
    platform?: string | null,
    role?: UserRole | null,
  ): Promise<void> {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      return;
    }

    const existingToken = await this.deviceTokensRepository.findOne({
      where: {
        token: normalizedToken,
      },
    });

    if (existingToken) {
      existingToken.userId = userId;
      existingToken.platform = platform?.trim() || existingToken.platform || 'unknown';
      existingToken.role = role ?? existingToken.role;
      existingToken.isActive = true;
      existingToken.lastSeenAt = new Date();
      await this.deviceTokensRepository.save(existingToken);
      return;
    }

    await this.deviceTokensRepository.save(
      this.deviceTokensRepository.create({
        userId,
        token: normalizedToken,
        platform: platform?.trim() || 'unknown',
        role: role ?? null,
        isActive: true,
        lastSeenAt: new Date(),
      }),
    );
  }

  getBufferedNotifications(): BufferedNotification[] {
    return this.notificationsQueueService.getBufferedNotifications();
  }

  private async deactivateDeviceToken(token: string): Promise<void> {
    await this.deviceTokensRepository.update(
      {
        token,
      },
      {
        isActive: false,
      },
    );
  }

  private serializePayload(
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Record<string, string> {
    return Object.entries(payload).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (value === undefined || value === null) {
          return accumulator;
        }

        accumulator[key] =
          typeof value === 'string' ? value : JSON.stringify(value);
        return accumulator;
      },
      {
        type,
      },
    );
  }
}

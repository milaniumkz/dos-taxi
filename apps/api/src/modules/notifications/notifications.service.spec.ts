import { UserRole } from '@dos/shared-types';
import { Repository } from 'typeorm';

import { UserEntity } from '../users/entities/user.entity';

import { NotificationDeviceTokenEntity } from './entities/notification-device-token.entity';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplateRenderer } from './notification-template.renderer';
import { NotificationsQueueService } from './notifications-queue.service';
import { NotificationsService } from './notifications.service';

describe('NotificationTemplateRenderer', () => {
  let renderer: NotificationTemplateRenderer;

  beforeEach(() => {
    renderer = new NotificationTemplateRenderer();
  });

  it('renders placeholders for Russian delivery notifications', () => {
    expect(
      renderer.render(
        'Доставка №{{orderId}} вручена{{recipientSuffix}}.',
        {
          orderId: 'order-42',
          recipientSuffix: ' (Dana)',
        },
      ),
    ).toBe('Доставка №order-42 вручена (Dana).');
  });

  it('keeps template valid when optional placeholders are empty', () => {
    expect(
      renderer.render(
        'Заказ №{{orderId}} отменён{{reasonSuffix}}.',
        {
          orderId: 'order-77',
          reasonSuffix: '',
        },
      ),
    ).toBe('Заказ №order-77 отменён.');
  });

  it('renders Kazakh notification body with missing values as empty string', () => {
    expect(
      renderer.render(
        '№{{orderId}} жеткізілімі алынды{{recipientSuffix}}.',
        {
          orderId: 'order-11',
        },
      ),
    ).toBe('№order-11 жеткізілімі алынды.');
  });
});

describe('NotificationsService', () => {
  let notificationsService: NotificationsService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let templatesRepository: jest.Mocked<Repository<NotificationTemplateEntity>>;
  let deviceTokensRepository: jest.Mocked<
    Repository<NotificationDeviceTokenEntity>
  >;
  let queueService: jest.Mocked<NotificationsQueueService>;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    templatesRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationTemplateEntity>>;
    deviceTokensRepository = {
      update: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((value) => value as NotificationDeviceTokenEntity),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationDeviceTokenEntity>>;
    queueService = {
      setInvalidPushTokenHandler: jest.fn(),
      enqueuePush: jest.fn(),
      enqueueSms: jest.fn(),
      getBufferedNotifications: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<NotificationsQueueService>;

    notificationsService = new NotificationsService(
      usersRepository,
      templatesRepository,
      deviceTokensRepository,
      new NotificationTemplateRenderer(),
      queueService,
    );
  });

  it('deactivates tokens reported invalid by the push queue', async () => {
    const handler = queueService.setInvalidPushTokenHandler.mock.calls[0][0];
    await handler('invalid-test-token');
    expect(deviceTokensRepository.update).toHaveBeenCalledWith(
      { token: 'invalid-test-token' },
      { isActive: false },
    );
  });

  it('prefers push templates when active device tokens exist', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      phone: '+77010000000',
    } as UserEntity);
    templatesRepository.find.mockResolvedValue([
      {
        type: 'order_accepted',
        channel: 'push',
        lang: 'ru',
        subject: 'Заказ принят',
        body: 'Заказ №{{orderId}} принят.',
        isActive: true,
      },
      {
        type: 'order_accepted',
        channel: 'sms',
        lang: 'ru',
        subject: null,
        body: 'Заказ №{{orderId}} принят.',
        isActive: true,
      },
    ] as NotificationTemplateEntity[]);
    deviceTokensRepository.find.mockResolvedValue([
      {
        userId: 'user-1',
        token: 'device-token-1',
        platform: 'android',
        isActive: true,
      },
    ] as NotificationDeviceTokenEntity[]);

    await notificationsService.send(
      'user-1',
      'order_accepted',
      { orderId: 'order-1' },
      'ru',
    );

    expect(queueService.enqueuePush).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'device-token-1',
        subject: 'Заказ принят',
        body: 'Заказ №order-1 принят.',
      }),
    );
    expect(queueService.enqueueSms).not.toHaveBeenCalled();
  });

  it('does not send non-OTP SMS when no device tokens exist', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      phone: '+77010000000',
    } as UserEntity);
    templatesRepository.find.mockResolvedValue([
      {
        type: 'delivery_completed',
        channel: 'sms',
        lang: 'ru',
        subject: null,
        body: 'Доставка №{{orderId}} вручена{{recipientSuffix}}.',
        isActive: true,
      },
    ] as NotificationTemplateEntity[]);
    deviceTokensRepository.find.mockResolvedValue([]);

    await notificationsService.send(
      'user-1',
      'delivery_completed',
      {
        orderId: 'order-42',
        recipientSuffix: ' (Dana)',
      },
      'ru',
    );

    expect(queueService.enqueuePush).not.toHaveBeenCalled();
    expect(queueService.enqueueSms).not.toHaveBeenCalled();
  });

  it('sends rendered OTP SMS through the explicit SMS path', async () => {
    templatesRepository.find.mockResolvedValue([
      { type: 'auth_otp', channel: 'sms', lang: 'ru', subject: null,
        body: 'Code {{code}}', isActive: true },
    ] as NotificationTemplateEntity[]);
    await notificationsService.sendSms('+77010000000', 'auth_otp', { code: '123456' }, 'ru');
    expect(templatesRepository.find).toHaveBeenCalledWith({
      where: { type: 'auth_otp', channel: 'sms', lang: 'ru', isActive: true },
    });
    expect(queueService.enqueueSms).toHaveBeenCalledWith({
      phone: '+77010000000', subject: null, body: 'Code 123456', type: 'auth_otp', lang: 'ru',
    });
    expect(queueService.enqueuePush).not.toHaveBeenCalled();
  });

  it('rejects OTP delivery when its active SMS template is missing', async () => {
    templatesRepository.find.mockResolvedValue([]);
    await expect(notificationsService.sendSms('+77010000000', 'auth_otp', { code: '123456' }, 'ru'))
      .rejects.toThrow('Active OTP SMS template is missing');
    expect(queueService.enqueueSms).not.toHaveBeenCalled();
  });

  it('updates existing device token registration', async () => {
    const existingToken = {
      userId: 'user-1',
      token: 'device-token-1',
      platform: 'ios',
      role: UserRole.CLIENT,
      isActive: false,
      lastSeenAt: new Date('2025-01-01T00:00:00Z'),
    } as NotificationDeviceTokenEntity;
    deviceTokensRepository.findOne.mockResolvedValue(existingToken);
    deviceTokensRepository.save.mockResolvedValue(existingToken);

    await notificationsService.registerDeviceToken(
      'user-2',
      'device-token-1',
      'android',
      UserRole.EXECUTOR,
    );

    expect(deviceTokensRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        token: 'device-token-1',
        platform: 'android',
        role: UserRole.EXECUTOR,
        isActive: true,
      }),
    );
  });
});

import {
  Currency,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
} from '@dos/shared-types';
import { Repository } from 'typeorm';

import { RedisStoreService } from '../../shared/cache/redis-store.service';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { UserEntity } from '../users/entities/user.entity';

import { PaymentCardEntity } from './entities/payment-card.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { DevStubPaymentProvider } from './providers/dev-stub-payment.provider';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let paymentsRepository: jest.Mocked<Repository<PaymentEntity>>;
  let paymentCardsRepository: jest.Mocked<Repository<PaymentCardEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let ordersService: jest.Mocked<OrdersService>;
  let redisStoreService: jest.Mocked<RedisStoreService>;
  let stubPaymentProvider: jest.Mocked<DevStubPaymentProvider>;

  beforeEach(() => {
    paymentsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((value) => value),
    } as unknown as jest.Mocked<Repository<PaymentEntity>>;
    paymentCardsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((value) => value),
    } as unknown as jest.Mocked<Repository<PaymentCardEntity>>;
    ordersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;
    usersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    ordersService = {
      transition: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;
    redisStoreService = {
      get: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;
    stubPaymentProvider = {
      providerName: 'stub',
      handleWebhook: jest.fn(),
      cancelPayment: jest.fn(),
      refundPayment: jest.fn(),
    } as unknown as jest.Mocked<DevStubPaymentProvider>;

    paymentsService = new PaymentsService(
      paymentsRepository,
      paymentCardsRepository,
      ordersRepository,
      usersRepository,
      ordersService,
      redisStoreService,
      stubPaymentProvider,
    );
  });

  it('processes webhook only once for the same event id', async () => {
    const payment = {
      id: 'payment-1',
      orderId: 'order-1',
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      amount: '2400.00',
      currency: Currency.KZT,
      provider: 'stub',
      providerTransactionId: 'stub-txn-1',
      idempotencyKey: 'pay-order-1',
      capturedAt: null,
      refundedAmount: '0.00',
    } as PaymentEntity;
    const order = {
      id: 'order-1',
      status: OrderStatus.IN_PROGRESS,
      serviceType: ServiceType.TAXI,
    } as OrderEntity;

    stubPaymentProvider.handleWebhook.mockResolvedValue({
      eventId: 'evt-1',
      transactionId: 'stub-txn-1',
      orderId: 'order-1',
      status: PaymentStatus.CAPTURED,
      amount: 2400,
    });
    paymentsRepository.findOne.mockResolvedValue(payment);
    paymentsRepository.save.mockImplementation(async (value) => value as PaymentEntity);
    ordersRepository.findOne.mockResolvedValue(order);
    redisStoreService.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('1');

    const firstResult = await paymentsService.handleWebhook('stub', {
      eventId: 'evt-1',
      transactionId: 'stub-txn-1',
      orderId: 'order-1',
      status: PaymentStatus.CAPTURED,
    });
    const secondResult = await paymentsService.handleWebhook('stub', {
      eventId: 'evt-1',
      transactionId: 'stub-txn-1',
      orderId: 'order-1',
      status: PaymentStatus.CAPTURED,
    });

    expect(firstResult).toEqual({ processed: true, duplicated: false });
    expect(secondResult).toEqual({ processed: true, duplicated: true });
    expect(paymentsRepository.save).toHaveBeenCalledTimes(1);
    expect(ordersService.transition).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.COMPLETED,
      'system:payment_capture',
      { source: 'payment_capture' },
    );
  });

  it('refunds captured payments partially and updates refunded amount', async () => {
    const payment = {
      id: 'payment-2',
      orderId: 'order-2',
      status: PaymentStatus.CAPTURED,
      method: PaymentMethod.CARD,
      amount: '2400.00',
      currency: Currency.KZT,
      provider: 'stub',
      providerTransactionId: 'stub-txn-2',
      idempotencyKey: 'pay-order-2',
      capturedAt: new Date('2025-01-01T00:00:00Z'),
      refundedAmount: '0.00',
    } as PaymentEntity;

    paymentsRepository.findOne.mockResolvedValue(payment);
    paymentsRepository.save.mockImplementation(async (value) => value as PaymentEntity);
    stubPaymentProvider.refundPayment.mockResolvedValue(
      PaymentStatus.REFUNDED,
    );

    const result = await paymentsService.refundPayment('payment-2', {
      amount: 1200,
      reason: 'duplicate charge',
    });

    expect(stubPaymentProvider.refundPayment).toHaveBeenCalledWith({
      transactionId: 'stub-txn-2',
      amount: 1200,
      reason: 'duplicate charge',
    });
    expect(payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(payment.refundedAmount).toBe('1200.00');
    expect(result.refundedAmount).toBe('1200.00');
  });

  it('cancels authorized payments', async () => {
    const payment = {
      id: 'payment-3',
      orderId: 'order-3',
      status: PaymentStatus.AUTHORIZED,
      method: PaymentMethod.CARD,
      amount: '2400.00',
      currency: Currency.KZT,
      provider: 'stub',
      providerTransactionId: 'stub-txn-3',
      idempotencyKey: 'pay-order-3',
      capturedAt: null,
      refundedAmount: '0.00',
    } as PaymentEntity;

    paymentsRepository.findOne.mockResolvedValue(payment);
    paymentsRepository.save.mockImplementation(async (value) => value as PaymentEntity);
    stubPaymentProvider.cancelPayment.mockResolvedValue(
      PaymentStatus.CANCELLED,
    );

    const result = await paymentsService.cancelPayment('payment-3', {
      reason: 'client request',
    });

    expect(stubPaymentProvider.cancelPayment).toHaveBeenCalledWith({
      transactionId: 'stub-txn-3',
      reason: 'client request',
    });
    expect(payment.status).toBe(PaymentStatus.CANCELLED);
    expect(result.status).toBe(PaymentStatus.CANCELLED);
  });
});

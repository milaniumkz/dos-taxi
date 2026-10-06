import {
  Currency,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '@dos/shared-types';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AdminController } from '../../src/modules/admin/admin.controller';
import { AdminService } from '../../src/modules/admin/admin.service';
import { CreateCityDto } from '../../src/modules/admin/dto/create-city.dto';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { JwtPayload } from '../../src/modules/auth/interfaces/jwt-payload.interface';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

@Injectable()
class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();
    const role = (request.headers['x-test-role'] as UserRole | undefined) ?? UserRole.SUPPORT;
    request.user = {
      sub: 'staff-1',
      phone: '+77010000000',
      role,
    };
    return true;
  }
}

describe('AdminController roles integration', () => {
  let app: INestApplication;

  const adminServiceMock = {
    listCities: jest.fn(async () => []),
    getCityDetail: jest.fn(async (cityId: string) => ({
      id: cityId,
      nameRu: 'Алматы',
      nameKk: 'Алматы',
      countryCode: 'KZ',
      currency: Currency.KZT,
      timezone: 'Asia/Almaty',
      isActive: true,
      serviceZone: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    })),
    listUsers: jest.fn(async () => []),
    listExecutors: jest.fn(async () => []),
    getTariffDetail: jest.fn(async (tariffId: string) => ({
      id: tariffId,
      cityId: '11111111-1111-4111-8111-111111111111',
      serviceType: 'taxi',
      vehicleClass: 'economy',
      nameRu: 'Такси Эконом',
      nameKk: 'Такси Эконом',
      basePrice: '650.00',
      pricePerKm: '132.0000',
      pricePerMinute: '38.0000',
      minimumPrice: '1450.00',
      freeWaitingSeconds: 180,
      paidWaitingPerMinute: '0.0000',
      currency: Currency.KZT,
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validTo: null,
      isActive: true,
      createdById: 'staff-1',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    })),
    listOrders: jest.fn(async () => ({
      items: [
        {
          id: 'order-1',
          serviceType: 'taxi',
          status: 'completed',
          clientId: 'client-1',
          executorId: 'executor-1',
          cityId: 'city-1',
          currency: Currency.KZT,
          paymentMethod: 'card',
          estimatedPrice: '2400.00',
          finalPrice: '2400.00',
          discountAmount: '125.00',
          promoCodeId: 'promo-1',
          promoCodeCode: 'WELCOME2025',
          pickupAddress: 'Абая, 10',
          destinationAddress: 'Сатпаева, 20',
          deliveryStatus: null,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          scheduledAt: null,
        },
      ],
      nextCursor: null,
    })),
    getPromoCodeDetail: jest.fn(async (promoCodeId: string) => ({
      id: promoCodeId,
      code: 'WELCOME2025',
      discountType: 'percent',
      discountValue: '10.00',
      maxUses: 100,
      validTo: new Date('2025-01-31T23:59:59Z'),
      isActive: true,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T01:00:00Z'),
    })),
    getPromoCodeAnalytics: jest.fn(async (promoCodeId: string, query?: {
      period?: 'day' | 'week' | 'month';
      cityId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      serviceType?: string;
      paymentMethod?: string;
    }) => ({
      ...(query ? {} : {}),
      promoCodeId,
      code: 'WELCOME2025',
      totalOrders: 12,
      completedOrders: 9,
      grossTotalsByCurrency: { KZT: 42000 },
      discountTotalsByCurrency: { KZT: 3200 },
      taxiOrders: 8,
      deliveryOrders: 4,
      uniqueClients: 10,
      firstTimeRedemptions: 3,
      repeatRedemptions: 9,
      usageRate: 12,
      completionRate: 75,
      firstOrderConversion: 30,
      lastRedeemedAt: new Date('2025-01-10T10:00:00Z'),
      paymentMethodBreakdown: [
        {
          paymentMethod: 'card',
          orderCount: 9,
          grossTotalsByCurrency: { KZT: 34000 },
          discountTotalsByCurrency: { KZT: 2600 },
        },
        {
          paymentMethod: 'cash',
          orderCount: 3,
          grossTotalsByCurrency: { KZT: 8000 },
          discountTotalsByCurrency: { KZT: 600 },
        },
      ],
      statusBreakdown: [
        {
          status: 'completed',
          orderCount: 9,
          grossTotalsByCurrency: { KZT: 32000 },
          discountTotalsByCurrency: { KZT: 2400 },
        },
        {
          status: 'cancelled_system',
          orderCount: 3,
          grossTotalsByCurrency: { KZT: 10000 },
          discountTotalsByCurrency: { KZT: 800 },
        },
      ],
      cityBreakdown: [
        {
          cityId: 'city-1',
          cityNameRu: 'Алматы',
          cityNameKk: 'Алматы',
          orderCount: 9,
          completedOrders: 7,
          grossTotalsByCurrency: { KZT: 31000 },
          discountTotalsByCurrency: { KZT: 2400 },
        },
        {
          cityId: 'city-2',
          cityNameRu: 'Астана',
          cityNameKk: 'Астана',
          orderCount: 3,
          completedOrders: 2,
          grossTotalsByCurrency: { KZT: 11000 },
          discountTotalsByCurrency: { KZT: 800 },
        },
      ],
    })),
    listActivity: jest.fn(async () => [
      {
        id: 'activity-1',
        action: 'note.updated',
        entityType: 'order',
        entityId: '11111111-1111-4111-8111-111111111111',
        actorId: 'staff-1',
        actorName: 'Operator',
        metadata: {
          noteId: 'note-1',
          state: 'resolved',
        },
        createdAt: new Date('2025-01-01T02:00:00Z'),
      },
    ]),
    listNotes: jest.fn(async () => [
      {
        id: 'note-1',
        entityType: 'order',
        entityId: '11111111-1111-4111-8111-111111111111',
        body: 'manual follow-up required',
        kind: 'handoff',
        isPinned: true,
        state: 'open',
        createdById: 'staff-1',
        createdByName: 'Operator',
        assignedToId: '22222222-2222-4222-8222-222222222222',
        assignedToName: 'Dispatcher',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        resolvedAt: null,
        archivedAt: null,
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      },
    ]),
    createNote: jest.fn(async (_actorId: string, dto: {
      entityType:
        | 'order'
        | 'user'
        | 'executor'
        | 'city'
        | 'tariff'
        | 'promo_code';
      entityId: string;
      body: string;
      kind?: 'context' | 'handoff' | 'escalation';
      isPinned?: boolean;
      assignedToId?: string | null;
    }) => ({
      id: 'note-2',
      entityType: dto.entityType,
      entityId: dto.entityId,
      body: dto.body,
      kind: dto.kind ?? 'context',
      isPinned: dto.isPinned ?? false,
      state: 'open',
      createdById: 'staff-1',
      createdByName: 'Operator',
      assignedToId: dto.assignedToId ?? null,
      assignedToName: dto.assignedToId ? 'Assigned User' : null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      resolvedAt: null,
      archivedAt: null,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    })),
    updateNote: jest.fn(async (noteId: string, _actorId: string, dto: {
      state?: 'open' | 'resolved' | 'archived';
      kind?: 'context' | 'handoff' | 'escalation';
      isPinned?: boolean;
      assignedToId?: string | null;
    }) => ({
      id: noteId,
      entityType: 'order',
      entityId: '11111111-1111-4111-8111-111111111111',
      body: 'manual follow-up required',
      kind: dto.kind ?? 'handoff',
      isPinned: dto.isPinned ?? true,
      state: dto.state ?? 'open',
      createdById: 'staff-1',
      createdByName: 'Operator',
      assignedToId: dto.assignedToId ?? null,
      assignedToName: dto.assignedToId ? 'Assigned User' : null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      resolvedAt:
        dto.state === 'resolved' || dto.state === 'archived'
          ? new Date('2025-01-01T01:00:00Z')
          : null,
      archivedAt:
        dto.state === 'archived' ? new Date('2025-01-01T02:00:00Z') : null,
      updatedAt: new Date('2025-01-01T02:00:00Z'),
    })),
    getOrderDetail: jest.fn(async (orderId: string) => ({
      id: orderId,
      serviceType: 'taxi',
      status: 'searching',
      clientId: 'client-1',
      executorId: null,
      cityId: 'city-1',
      currency: 'KZT',
      paymentMethod: 'card',
      estimatedPrice: '2400.00',
      finalPrice: null,
      discountAmount: '125.00',
      promoCodeId: 'promo-1',
      promoCodeCode: 'WELCOME2025',
      pickupAddress: 'Абая, 10',
      destinationAddress: 'Сатпаева, 20',
      deliveryStatus: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      scheduledAt: null,
      client: null,
      executor: null,
      city: null,
      distanceMeters: 4200,
      durationSeconds: 960,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      clientRating: null,
      executorRating: null,
      updatedAt: new Date('2025-01-01T00:00:00Z'),
      routePoints: [],
      delivery: null,
      payments: [],
      statusEvents: [],
    })),
    refundPayment: jest.fn(async (paymentId: string) => ({
      id: paymentId,
      status: PaymentStatus.REFUNDED,
      method: PaymentMethod.CARD,
      amount: '2400.00',
      currency: Currency.KZT,
      provider: 'stub',
      providerTransactionId: 'txn-1',
      orderId: 'order-1',
      capturedAt: new Date('2025-01-01T00:00:00Z'),
      refundedAmount: '2400.00',
      idempotencyKey: 'idem-1',
    })),
    updateOrderStatus: jest.fn(async (orderId: string) => ({
      id: orderId,
      serviceType: 'taxi',
      status: 'cancelled_system',
      clientId: 'client-1',
      executorId: 'executor-1',
      cityId: 'city-1',
      currency: 'KZT',
      paymentMethod: 'card',
      estimatedPrice: '2400.00',
      finalPrice: null,
      discountAmount: '125.00',
      promoCodeId: 'promo-1',
      promoCodeCode: 'WELCOME2025',
      pickupAddress: 'Абая, 10',
      destinationAddress: 'Сатпаева, 20',
      deliveryStatus: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      scheduledAt: null,
    })),
    restartOrderDispatch: jest.fn(async (orderId: string) => ({
      id: orderId,
      serviceType: 'taxi',
      status: 'searching',
      clientId: 'client-1',
      executorId: null,
      cityId: 'city-1',
      currency: 'KZT',
      paymentMethod: 'card',
      estimatedPrice: '2400.00',
      finalPrice: null,
      discountAmount: '125.00',
      promoCodeId: 'promo-1',
      promoCodeCode: 'WELCOME2025',
      pickupAddress: 'Абая, 10',
      destinationAddress: 'Сатпаева, 20',
      deliveryStatus: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      scheduledAt: null,
    })),
    cancelPayment: jest.fn(async (paymentId: string) => ({
      id: paymentId,
      status: PaymentStatus.CANCELLED,
      method: PaymentMethod.CARD,
      amount: '2400.00',
      currency: Currency.KZT,
      provider: 'stub',
      providerTransactionId: 'txn-1',
      orderId: 'order-1',
      capturedAt: null,
      refundedAmount: '0.00',
      idempotencyKey: 'idem-1',
    })),
    createCity: jest.fn(async (_actorId: string, dto: CreateCityDto) => ({
      id: 'city-1',
      nameRu: dto.nameRu,
      nameKk: dto.nameKk,
      countryCode: dto.countryCode,
      currency: dto.currency,
      timezone: dto.timezone,
      isActive: dto.isActive ?? false,
      serviceZone: dto.serviceZone ?? null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    })),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        Reflector,
        RolesGuard,
        {
          provide: AdminService,
          useValue: adminServiceMock,
        },
      ],
    });

    const moduleRef = await moduleBuilder
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureHttpApplication(app, {
      apiPrefix: 'api/v1',
    });
    await app.init();
    app.getHttpServer = () => app.getHttpAdapter().getInstance();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows support to read cities', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/cities')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read city details', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/cities/city-1')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read tariff details', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/tariffs/tariff-1')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read users', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/users')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read executors', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/executors')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read promo code details', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/promo-codes/promo-1')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read promo code analytics', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/promo-codes/promo-1/analytics')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read promo code analytics with period and city filters', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/promo-codes/promo-1/analytics')
      .query({
        period: 'week',
        cityId: '11111111-1111-4111-8111-111111111111',
        dateFrom: '2025-01-01T00:00:00.000Z',
        dateTo: '2025-01-31T23:59:59.999Z',
        status: 'completed',
        serviceType: 'delivery',
        paymentMethod: 'card',
      })
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);

    expect(adminServiceMock.getPromoCodeAnalytics).toHaveBeenCalledWith(
      'promo-1',
      expect.objectContaining({
        period: 'week',
        cityId: '11111111-1111-4111-8111-111111111111',
        dateFrom: '2025-01-01T00:00:00.000Z',
        dateTo: '2025-01-31T23:59:59.999Z',
        status: 'completed',
        serviceType: 'delivery',
        paymentMethod: 'card',
      }),
    );
  });

  it('allows support to read orders filtered by promo code', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/orders')
      .query({
        promoCodeId: 'promo-1',
        dateFrom: '2025-01-01T00:00:00.000Z',
        dateTo: '2025-01-31T23:59:59.999Z',
        status: 'completed',
        serviceType: 'delivery',
        paymentMethod: 'card',
      })
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);

    expect(adminServiceMock.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        promoCodeId: 'promo-1',
        dateFrom: '2025-01-01T00:00:00.000Z',
        dateTo: '2025-01-31T23:59:59.999Z',
        status: 'completed',
        serviceType: 'delivery',
        paymentMethod: 'card',
      }),
    );
  });

  it('allows support to read order details', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/orders/order-1')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(200);
  });

  it('allows support to read internal notes', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/notes')
      .set('x-test-role', UserRole.SUPPORT)
      .query({
        entityType: 'order',
        entityId: '11111111-1111-4111-8111-111111111111',
        kind: 'handoff',
        isPinned: 'true',
        query: 'note-1',
      })
      .expect(200);

    expect(adminServiceMock.listNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'order',
        entityId: '11111111-1111-4111-8111-111111111111',
        kind: 'handoff',
        isPinned: true,
        query: 'note-1',
      }),
    );
  });

  it('allows support to read city-scoped internal notes', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/notes')
      .set('x-test-role', UserRole.SUPPORT)
      .query({
        entityType: 'city',
        entityId: '11111111-1111-4111-8111-111111111111',
      })
      .expect(200);

    expect(adminServiceMock.listNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'city',
        entityId: '11111111-1111-4111-8111-111111111111',
      }),
    );
  });

  it('allows support to read activity log', async () => {
    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/activity')
      .set('x-test-role', UserRole.SUPPORT)
      .query({
        entityType: 'order',
        action: 'note.updated',
        group: 'note',
        window: 'day',
      })
      .expect(200);
  });

  it('forbids support from creating cities', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/cities')
      .set('x-test-role', UserRole.SUPPORT)
      .send({
        nameRu: 'Алматы',
        nameKk: 'Алматы',
        countryCode: 'KZ',
        currency: 'KZT',
        timezone: 'Asia/Almaty',
      })
      .expect(403);
  });

  it('forbids support from refunding payments', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/payments/payment-1/refund')
      .set('x-test-role', UserRole.SUPPORT)
      .send({})
      .expect(403);
  });

  it('forbids support from cancelling payments', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/payments/payment-1/cancel')
      .set('x-test-role', UserRole.SUPPORT)
      .send({})
      .expect(403);
  });

  it('forbids support from changing order status', async () => {
    await request(app.getHttpAdapter().getInstance())
      .patch('/api/v1/admin/orders/order-1/status')
      .set('x-test-role', UserRole.SUPPORT)
      .send({
        status: 'failed',
      })
      .expect(403);
  });

  it('forbids support from restarting dispatch', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/orders/order-1/dispatch/retry')
      .set('x-test-role', UserRole.SUPPORT)
      .expect(403);
  });

  it('forbids support from creating internal notes', async () => {
    await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/notes')
      .set('x-test-role', UserRole.SUPPORT)
      .send({
        entityType: 'order',
        entityId: '11111111-1111-4111-8111-111111111111',
        body: 'manual note',
      })
      .expect(403);
  });

  it('forbids support from updating internal notes', async () => {
    await request(app.getHttpAdapter().getInstance())
      .patch('/api/v1/admin/notes/note-1')
      .set('x-test-role', UserRole.SUPPORT)
      .send({
        state: 'resolved',
      })
      .expect(403);
  });

  it('allows admin to create cities', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/cities')
      .set('x-test-role', UserRole.ADMIN)
      .send({
        nameRu: 'Алматы',
        nameKk: 'Алматы',
        countryCode: 'KZ',
        currency: 'KZT',
        timezone: 'Asia/Almaty',
      })
      .expect(201);

    expect(response.body.id).toBe('city-1');
    expect(adminServiceMock.createCity).toHaveBeenCalled();
  });

  it('allows operator to refund payments', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/payments/payment-1/refund')
      .set('x-test-role', UserRole.OPERATOR)
      .send({
        amount: 1200,
        reason: 'duplicate charge',
      })
      .expect(200);

    expect(response.body.id).toBe('payment-1');
    expect(adminServiceMock.refundPayment).toHaveBeenCalled();
  });

  it('allows operator to cancel payments', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/payments/payment-1/cancel')
      .set('x-test-role', UserRole.OPERATOR)
      .send({
        reason: 'client request',
      })
      .expect(200);

    expect(response.body.id).toBe('payment-1');
    expect(adminServiceMock.cancelPayment).toHaveBeenCalled();
  });

  it('allows operator to restart dispatch', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/orders/order-1/dispatch/retry')
      .set('x-test-role', UserRole.OPERATOR)
      .expect(200);

    expect(response.body.id).toBe('order-1');
    expect(adminServiceMock.restartOrderDispatch).toHaveBeenCalled();
  });

  it('allows operator to change order status', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .patch('/api/v1/admin/orders/order-1/status')
      .set('x-test-role', UserRole.OPERATOR)
      .send({
        status: 'failed',
        reason: 'manual resolution',
      })
      .expect(200);

    expect(response.body.id).toBe('order-1');
    expect(adminServiceMock.updateOrderStatus).toHaveBeenCalled();
  });

  it('allows operator to create internal notes', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/notes')
      .set('x-test-role', UserRole.OPERATOR)
      .send({
        entityType: 'order',
        entityId: '11111111-1111-4111-8111-111111111111',
        body: 'follow-up with executor',
        kind: 'handoff',
        isPinned: true,
        assignedToId: '22222222-2222-4222-8222-222222222222',
      })
      .expect(201);

    expect(response.body.id).toBe('note-2');
    expect(adminServiceMock.createNote).toHaveBeenCalled();
  });

  it('allows operator to update internal notes', async () => {
    const response = await request(app.getHttpAdapter().getInstance())
      .patch('/api/v1/admin/notes/note-1')
      .set('x-test-role', UserRole.OPERATOR)
      .send({
        state: 'resolved',
        assignedToId: '22222222-2222-4222-8222-222222222222',
        isPinned: false,
      })
      .expect(200);

    expect(response.body.id).toBe('note-1');
    expect(adminServiceMock.updateNote).toHaveBeenCalled();
  });
});

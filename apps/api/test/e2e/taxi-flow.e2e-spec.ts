import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
  UserRole,
} from '@dos/shared-types';
import request from 'supertest';

import {
  createPlatformE2EHarness,
  E2EHarness,
  TEST_CITY_ID,
} from './support/platform-harness';

async function registerUser(
  harness: E2EHarness,
  phone: string,
  role: UserRole.CLIENT | UserRole.EXECUTOR,
) {
  await request(harness.app.getHttpAdapter().getInstance())
    .post('/api/v1/auth/send-otp')
    .send({ phone })
    .expect(201);

  const response = await request(harness.app.getHttpAdapter().getInstance())
    .post('/api/v1/auth/verify-otp')
    .send({
      phone,
      code: '1234',
      role,
    })
    .expect(201);

  return response.body as {
    accessToken: string;
    refreshToken: string;
  };
}

describe('TAXI_FLOW e2e', () => {
  let harness: E2EHarness;

  beforeAll(async () => {
    harness = await createPlatformE2EHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('covers register -> estimate -> create_order -> driver lifecycle -> client_rate -> payment captured', async () => {
    const clientSession = await registerUser(
      harness,
      '+77010000011',
      UserRole.CLIENT,
    );
    const executorSession = await registerUser(
      harness,
      '+77010000012',
      UserRole.EXECUTOR,
    );

    const bindCardResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/payments/cards/bind')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        token: 'tok_test_taxi',
        panMask: '4000 00** **** 2458',
        holderName: 'Aruzhan Tulegen',
        makeDefault: true,
      })
      .expect(201);

    const estimateResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/orders/estimate')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        cityId: TEST_CITY_ID,
        serviceType: ServiceType.TAXI,
        carClass: 'economy',
        distanceMeters: 5400,
        durationSeconds: 960,
      })
      .expect(201);

    expect(estimateResponse.body.estimatedPrice).toBeDefined();

    const createOrderResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        serviceType: ServiceType.TAXI,
        cityId: TEST_CITY_ID,
        paymentMethod: PaymentMethod.CARD,
        carClass: 'economy',
        routePoints: [
          {
            sequenceIndex: 0,
            lat: 43.238949,
            lng: 76.889709,
            address: 'Abay Ave 10',
          },
          {
            sequenceIndex: 1,
            lat: 43.245,
            lng: 76.95,
            address: 'Dostyk Ave 15',
          },
        ],
        distanceMeters: 5400,
        durationSeconds: 960,
      })
      .expect(201);

    const orderId = createOrderResponse.body.id as string;

    const holdResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/payments/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        cardId: bindCardResponse.body.id,
        idempotencyKey: 'taxi-hold-1',
      })
      .expect(201);

    expect(holdResponse.body.status).toBe(PaymentStatus.AUTHORIZED);

    await request(harness.app.getHttpAdapter().getInstance())
      .get('/api/v1/executor/orders/incoming')
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body[0].orderId).toBe(orderId);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/executor/orders/${orderId}/accept`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .expect(201);

    expect(
      harness.ordersService.notifications.some(
        (notification) =>
          notification.type === 'order_accepted' &&
          notification.orderId === orderId,
      ),
    ).toBe(true);

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .send({
        status: OrderStatus.ARRIVING,
        lat: 43.239,
        lng: 76.89,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.ARRIVING);
      });

    expect(
      harness.ordersService.realtimeEvents.some(
        (event) =>
          event.orderId === orderId &&
          event.lat === 43.239 &&
          event.lng === 76.89,
      ),
    ).toBe(true);

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .send({
        status: OrderStatus.WAITING,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.WAITING);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .send({
        status: OrderStatus.IN_PROGRESS,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.IN_PROGRESS);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .send({
        status: OrderStatus.COMPLETED,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.COMPLETED);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/orders/${orderId}/rate`)
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        executorRating: 5,
        comment: 'Smooth ride',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.COMPLETED);
        expect(response.body.executorRating).toBe(5);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .get('/api/v1/orders/history')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items[0].id).toBe(orderId);
      });

    expect(harness.paymentsService.getPaymentByOrder(orderId)?.status).toBe(
      PaymentStatus.CAPTURED,
    );
  });
});

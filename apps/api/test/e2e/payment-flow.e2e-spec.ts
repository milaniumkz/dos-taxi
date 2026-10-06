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
  };
}

async function createTaxiOrder(
  harness: E2EHarness,
  accessToken: string,
  addressPrefix: string,
) {
  const response = await request(harness.app.getHttpAdapter().getInstance())
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${accessToken}`)
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
          address: `${addressPrefix} pickup`,
        },
        {
          sequenceIndex: 1,
          lat: 43.245,
          lng: 76.95,
          address: `${addressPrefix} dropoff`,
        },
      ],
      distanceMeters: 5100,
      durationSeconds: 900,
    })
    .expect(201);

  return response.body.id as string;
}

describe('PAYMENT_FLOW e2e', () => {
  let harness: E2EHarness;

  beforeAll(async () => {
    harness = await createPlatformE2EHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('covers bind_card -> pay_with_hold -> capture_on_complete -> partial_refund_after_cancel', async () => {
    const clientSession = await registerUser(
      harness,
      '+77010000021',
      UserRole.CLIENT,
    );
    const executorSession = await registerUser(
      harness,
      '+77010000022',
      UserRole.EXECUTOR,
    );

    const bindCardResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/payments/cards/bind')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        token: 'tok_test_payment',
        panMask: '4000 00** **** 7654',
        holderName: 'Dana Smagulova',
        makeDefault: true,
      })
      .expect(201);

    const firstOrderId = await createTaxiOrder(
      harness,
      clientSession.accessToken,
      'first',
    );

    await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/payments/orders/${firstOrderId}/pay`)
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        cardId: bindCardResponse.body.id,
        idempotencyKey: 'payment-flow-first',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe(PaymentStatus.AUTHORIZED);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/executor/orders/${firstOrderId}/accept`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${firstOrderId}/status`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .send({
        status: OrderStatus.IN_PROGRESS,
      })
      .expect(200);

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${firstOrderId}/status`)
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .send({
        status: OrderStatus.COMPLETED,
      })
      .expect(200);

    expect(
      harness.paymentsService.getPaymentByOrder(firstOrderId)?.status,
    ).toBe(PaymentStatus.CAPTURED);

    const secondOrderId = await createTaxiOrder(
      harness,
      clientSession.accessToken,
      'second',
    );

    await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/payments/orders/${secondOrderId}/pay`)
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        cardId: bindCardResponse.body.id,
        idempotencyKey: 'payment-flow-second',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe(PaymentStatus.AUTHORIZED);
      });

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/orders/${secondOrderId}/cancel`)
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        reason: 'Client changed plans',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.CANCELLED_CLIENT);
      });

    expect(
      harness.paymentsService.getPaymentByOrder(secondOrderId)?.status,
    ).toBe(PaymentStatus.PARTIALLY_REFUNDED);
  });
});

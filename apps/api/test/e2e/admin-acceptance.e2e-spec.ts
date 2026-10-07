import { randomUUID } from 'node:crypto';
import {
  Currency,
  PaymentMethod,
  ServiceType,
  UserRole,
} from '@dos/shared-types';
import request from 'supertest';

import {
  createPlatformE2EHarness,
  E2EHarness,
  TEST_CITY_ID,
} from './support/platform-harness';

function createAdminToken(harness: E2EHarness): string {
  return harness.authService.createSessionForRole(
    '+77010000061',
    UserRole.ADMIN,
  ).accessToken;
}

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
    user: { id: string };
  };
}

describe('Admin acceptance e2e', () => {
  let harness: E2EHarness;

  beforeAll(async () => {
    harness = await createPlatformE2EHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  it('applies updated tariff to new taxi estimates and orders', async () => {
    const adminToken = createAdminToken(harness);
    const clientSession = await registerUser(
      harness,
      '+77010000062',
      UserRole.CLIENT,
    );

    const beforeEstimate = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/orders/estimate')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        cityId: TEST_CITY_ID,
        serviceType: ServiceType.TAXI,
        distanceMeters: 5400,
        durationSeconds: 960,
        carClass: 'economy',
      })
      .expect(201);

    const tariffResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/admin/tariffs')
      .set('X-Idempotency-Key', randomUUID())
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cityId: TEST_CITY_ID,
        serviceType: ServiceType.TAXI,
        vehicleClass: 'economy',
        nameRu: 'Эконом плюс',
        nameKk: 'Эконом плюс',
        basePrice: 900,
        pricePerKm: 180,
        pricePerMinute: 50,
        minimumPrice: 1800,
        currency: Currency.KZT,
      })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .patch(`/api/v1/admin/tariffs/${tariffResponse.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        basePrice: 950,
        pricePerKm: 190,
        pricePerMinute: 55,
        minimumPrice: 1900,
      })
      .expect(200);

    const afterEstimate = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/orders/estimate')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        cityId: TEST_CITY_ID,
        serviceType: ServiceType.TAXI,
        distanceMeters: 5400,
        durationSeconds: 960,
        carClass: 'economy',
      })
      .expect(201);

    expect(Number(afterEstimate.body.estimatedPrice)).toBeGreaterThan(
      Number(beforeEstimate.body.estimatedPrice),
    );

    const orderResponse = await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        serviceType: ServiceType.TAXI,
        cityId: TEST_CITY_ID,
        paymentMethod: PaymentMethod.CASH,
        carClass: 'economy',
        routePoints: [
          {
            sequenceIndex: 0,
            lat: 43.238949,
            lng: 76.889709,
            address: 'Tariff pickup',
          },
          {
            sequenceIndex: 1,
            lat: 43.245,
            lng: 76.95,
            address: 'Tariff dropoff',
          },
        ],
        distanceMeters: 5400,
        durationSeconds: 960,
      })
      .expect(201);

    expect(orderResponse.body.estimatedPrice).toBe(afterEstimate.body.estimatedPrice);
    expect(tariffResponse.body.id).toBeDefined();
  });

  it('blocks executor from receiving incoming offers', async () => {
    const adminToken = createAdminToken(harness);
    const clientSession = await registerUser(
      harness,
      '+77010000063',
      UserRole.CLIENT,
    );
    const executorSession = await registerUser(
      harness,
      '+77010000064',
      UserRole.EXECUTOR,
    );

    await request(harness.app.getHttpAdapter().getInstance())
      .post(`/api/v1/admin/executors/${executorSession.user.id}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isBlocked: true,
      })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientSession.accessToken}`)
      .send({
        serviceType: ServiceType.TAXI,
        cityId: TEST_CITY_ID,
        paymentMethod: PaymentMethod.CASH,
        carClass: 'economy',
        routePoints: [
          {
            sequenceIndex: 0,
            lat: 43.238949,
            lng: 76.889709,
            address: 'Blocked pickup',
          },
          {
            sequenceIndex: 1,
            lat: 43.245,
            lng: 76.95,
            address: 'Blocked dropoff',
          },
        ],
        distanceMeters: 3200,
        durationSeconds: 600,
      })
      .expect(201);

    await request(harness.app.getHttpAdapter().getInstance())
      .get('/api/v1/executor/orders/incoming')
      .set('Authorization', `Bearer ${executorSession.accessToken}`)
      .expect(200)
      .expect([]);
  });

  it('returns financial report without errors', async () => {
    const adminToken = createAdminToken(harness);

    await request(harness.app.getHttpAdapter().getInstance())
      .get('/api/v1/admin/reports/financial')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({
        period: 'day',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.period).toBe('day');
        expect(response.body.paymentsCount).toBeGreaterThanOrEqual(0);
        expect(response.body.capturedAmountByCurrency).toBeDefined();
      });
  });
});

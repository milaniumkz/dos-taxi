import {
  CourierVehicleType,
  DeliveryStatus,
  OrderStatus,
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

describe('DELIVERY_FLOW e2e', () => {
  let harness: E2EHarness;

  beforeAll(async () => {
    harness = await createPlatformE2EHarness();
  });

  afterAll(async () => {
    await harness.close();
  });

  it.each([
    [CourierVehicleType.BICYCLE, '+77010000041', '+77010000042'],
    [CourierVehicleType.MOPED, '+77010000043', '+77010000044'],
    [CourierVehicleType.SCOOTER, '+77010000045', '+77010000046'],
    [CourierVehicleType.CAR, '+77010000047', '+77010000048'],
  ])(
    'covers register_client -> create_delivery -> courier_accept -> pickup -> at_door -> deliver_confirmed for %s',
    async (vehicleType, clientPhone, courierPhone) => {
      const clientSession = await registerUser(
        harness,
        clientPhone,
        UserRole.CLIENT,
      );
      const courierSession = await registerUser(
        harness,
        courierPhone,
        UserRole.EXECUTOR,
      );

      const createOrderResponse = await request(harness.app.getHttpAdapter().getInstance())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${clientSession.accessToken}`)
        .send({
          serviceType: ServiceType.DELIVERY,
          cityId: TEST_CITY_ID,
          paymentMethod: PaymentMethod.CASH,
          courierVehicleType: vehicleType,
          packageDescription: `Documents by ${vehicleType}`,
          isFragile: vehicleType === CourierVehicleType.CAR,
          requiresReturn: vehicleType === CourierVehicleType.SCOOTER,
          recipientCode: '2468',
          routePoints: [
            {
              sequenceIndex: 0,
              lat: 43.238949,
              lng: 76.889709,
              address: 'Pickup point',
            },
            {
              sequenceIndex: 1,
              lat: 43.25,
              lng: 76.92,
              address: 'Dropoff point',
            },
          ],
          distanceMeters: 4200,
          durationSeconds: 1200,
        })
        .expect(201);

      const orderId = createOrderResponse.body.id as string;

      await request(harness.app.getHttpAdapter().getInstance())
        .get('/api/v1/executor/orders/incoming')
        .set('Authorization', `Bearer ${courierSession.accessToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body[0].orderId).toBe(orderId);
        });

      await request(harness.app.getHttpAdapter().getInstance())
        .post(`/api/v1/executor/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${courierSession.accessToken}`)
        .expect(201);

      await request(harness.app.getHttpAdapter().getInstance())
        .patch(`/api/v1/executor/orders/${orderId}/delivery/pickup`)
        .set('Authorization', `Bearer ${courierSession.accessToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.deliveryDetails.deliveryStatus).toBe(
            DeliveryStatus.PICKED_UP,
          );
          expect(response.body.status).toBe(OrderStatus.IN_PROGRESS);
        });

      await request(harness.app.getHttpAdapter().getInstance())
        .patch(`/api/v1/executor/orders/${orderId}/delivery/at-door`)
        .set('Authorization', `Bearer ${courierSession.accessToken}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.deliveryDetails.deliveryStatus).toBe(
            DeliveryStatus.AT_DOOR,
          );
        });

      await request(harness.app.getHttpAdapter().getInstance())
        .patch(`/api/v1/executor/orders/${orderId}/delivery/complete`)
        .set('Authorization', `Bearer ${courierSession.accessToken}`)
        .send({
          proofPhoto: 'https://cdn.example/proof.png',
          recipientCode: '2468',
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.status).toBe(OrderStatus.COMPLETED);
          expect(response.body.deliveryDetails.deliveryStatus).toBe(
            DeliveryStatus.DELIVERED_CONFIRMED,
          );
        });

      expect(
        harness.ordersService.notifications.some(
          (notification) =>
            notification.type === 'delivery_completed' &&
            notification.orderId === orderId,
        ),
      ).toBe(true);
    },
  );
});

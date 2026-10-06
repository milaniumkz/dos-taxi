import {
  CourierVehicleType,
  Currency,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from '@dos/shared-types';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../src/modules/auth/interfaces/jwt-payload.interface';
import { DispatchController } from '../../src/modules/dispatch/dispatch.controller';
import { DispatchService } from '../../src/modules/dispatch/dispatch.service';
import { IncomingDispatchOfferDto } from '../../src/modules/dispatch/dto/incoming-dispatch-offer.dto';
import { CreateOrderDto } from '../../src/modules/orders/dto/create-order.dto';
import { OrderResponseDto } from '../../src/modules/orders/dto/order-response.dto';
import { UpdateExecutorOrderStatusDto } from '../../src/modules/orders/dto/update-executor-order-status.dto';
import { ExecutorOrdersController } from '../../src/modules/orders/executor-orders.controller';
import { OrdersController } from '../../src/modules/orders/orders.controller';
import { OrdersService } from '../../src/modules/orders/orders.service';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

const TEST_CITY_ID = '11111111-1111-4111-8111-111111111111';

type StoredOrder = OrderResponseDto & {
  clientId: string;
};

@Injectable()
class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();
    request.user = {
      sub: request.headers['x-user-id'] ?? 'client-1',
      phone: '+77010000000',
      role: (request.headers['x-user-role'] as JwtPayload['role']) ?? 'client',
    };
    return true;
  }
}

class InMemoryOrdersService {
  private sequence = 1;
  readonly orders = new Map<string, StoredOrder>();

  async estimate() {
    return {
      estimatedPrice: '1500.00',
      currency: Currency.KZT,
      distanceMeters: 5400,
      durationSeconds: 900,
      surgeCoefficient: 1,
      nightCoefficient: 1,
      breakdown: [],
    };
  }

  async createOrder(clientId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const orderId = `order-${this.sequence++}`;
    const isDelivery = dto.serviceType === ServiceType.DELIVERY;
    const order: StoredOrder = {
      id: orderId,
      clientId,
      serviceType: dto.serviceType,
      status: OrderStatus.SEARCHING,
      cityId: dto.cityId ?? TEST_CITY_ID,
      currency: Currency.KZT,
      paymentMethod: dto.paymentMethod,
      promoCodeId: null,
      discountAmount: '0.00',
      executorId: null,
      estimatedPrice: '2200.00',
      finalPrice: null,
      distanceMeters: dto.distanceMeters ?? 5400,
      durationSeconds: dto.durationSeconds ?? 900,
      carClass: dto.carClass ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      executorRating: null,
      routePoints: dto.routePoints,
      deliveryDetails: isDelivery
        ? {
            courierVehicleType: dto.courierVehicleType!,
            packageDescription: dto.packageDescription ?? null,
            packagePhotoUrl: dto.packagePhoto ?? null,
            declaredValue: dto.declaredValue?.toFixed(2) ?? null,
            isFragile: dto.isFragile ?? false,
            requiresReturn: dto.requiresReturn ?? false,
            cashOnDelivery: dto.cashOnDelivery?.toFixed(2) ?? null,
            deliveryStatus: DeliveryStatus.PENDING_PICKUP,
            proofPhotoUrl: null,
            recipientCode: dto.recipientCode ?? null,
          }
        : undefined,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    this.orders.set(orderId, order);
    return order;
  }

  async getHistory(clientId: string) {
    return {
      items: [...this.orders.values()].filter((order) => order.clientId === clientId),
      nextCursor: null,
    };
  }

  async getActiveOrder(clientId: string): Promise<OrderResponseDto> {
    const activeOrder = [...this.orders.values()].find(
      (order) =>
        order.clientId === clientId &&
        [
          OrderStatus.SEARCHING,
          OrderStatus.ACCEPTED,
          OrderStatus.ARRIVING,
          OrderStatus.WAITING,
          OrderStatus.IN_PROGRESS,
          OrderStatus.DELIVERED,
        ].includes(order.status),
    );

    if (!activeOrder) {
      throw new NotFoundException({
        code: 'CLIENT_ACTIVE_ORDER_NOT_FOUND',
        message: 'Client has no active order',
      });
    }

    return activeOrder;
  }

  async getExecutorHistory(executorUserId: string) {
    return {
      items: [...this.orders.values()].filter(
        (order) => order.executorId === executorUserId,
      ),
      nextCursor: null,
    };
  }

  async getExecutorActiveOrder(
    executorUserId: string,
  ): Promise<OrderResponseDto> {
    const activeOrder = [...this.orders.values()].find(
      (order) =>
        order.executorId === executorUserId &&
        [
          OrderStatus.ACCEPTED,
          OrderStatus.ARRIVING,
          OrderStatus.WAITING,
          OrderStatus.IN_PROGRESS,
          OrderStatus.DELIVERED,
        ].includes(order.status),
    );

    if (!activeOrder) {
      throw new NotFoundException({
        code: 'EXECUTOR_ACTIVE_ORDER_NOT_FOUND',
        message: 'Executor has no active order',
      });
    }

    return activeOrder;
  }

  async getOrder(clientId: string, orderId: string): Promise<OrderResponseDto> {
    const order = this.orders.get(orderId);
    if (!order || order.clientId !== clientId) {
      throw new Error('ORDER_NOT_FOUND');
    }
    return order;
  }

  async cancelOrder(
    clientId: string,
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrder(clientId, orderId);
    order.status = OrderStatus.CANCELLED_CLIENT;
    order.cancelReason = reason ?? null;
    order.cancelledAt = new Date('2025-01-01T01:00:00Z');
    return order;
  }

  async rateOrder(
    clientId: string,
    orderId: string,
    executorRating: number,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrder(clientId, orderId);
    order.executorRating = executorRating;
    return order;
  }

  async updateExecutorOrderStatus(
    executorUserId: string,
    orderId: string,
    dto: UpdateExecutorOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = dto.status;
    if (dto.status === OrderStatus.IN_PROGRESS) {
      order.startedAt = new Date('2025-01-01T02:00:00Z');
    }
    if (dto.status === OrderStatus.COMPLETED) {
      order.completedAt = new Date('2025-01-01T03:00:00Z');
      order.finalPrice = order.estimatedPrice;
    }
    return order;
  }

  async markDeliveryPickedUp(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = OrderStatus.IN_PROGRESS;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.PICKED_UP;
    }
    return order;
  }

  async markDeliveryAtDoor(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.AT_DOOR;
    }
    return order;
  }

  async completeDelivery(
    executorUserId: string,
    orderId: string,
    dto: { proofPhoto?: string; recipientCode?: string },
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date('2025-01-01T03:00:00Z');
    order.finalPrice = order.estimatedPrice;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERED_CONFIRMED;
      order.deliveryDetails.proofPhotoUrl = dto.proofPhoto ?? null;
      order.deliveryDetails.recipientCode =
        dto.recipientCode ?? order.deliveryDetails.recipientCode ?? null;
    }
    return order;
  }

  async failDelivery(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = OrderStatus.FAILED;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERY_FAILED;
    }
    return order;
  }

  private getById(orderId: string): StoredOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }
    return order;
  }
}

class InMemoryDispatchService {
  constructor(private readonly ordersService: InMemoryOrdersService) {}

  async getIncomingOffers(): Promise<IncomingDispatchOfferDto[]> {
    return [...this.ordersService.orders.values()]
      .filter((order) => order.status === OrderStatus.SEARCHING)
      .map((order) => ({
        orderId: order.id,
        serviceType: order.serviceType,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        clientName: null,
        clientPhone: null,
        estimatedPrice: order.estimatedPrice,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
        pickupAddress: order.routePoints[0]?.address ?? null,
        pickupLat: order.routePoints[0]?.lat ?? null,
        pickupLng: order.routePoints[0]?.lng ?? null,
        destinationAddress: order.routePoints.at(-1)?.address ?? null,
        destinationLat: order.routePoints.at(-1)?.lat ?? null,
        destinationLng: order.routePoints.at(-1)?.lng ?? null,
        offeredAt: new Date('2025-01-01T00:10:00Z'),
      }));
  }

  async acceptOrder(executorUserId: string, orderId: string) {
    const order = this.ordersService.orders.get(orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }
    order.executorId = executorUserId;
    order.status = OrderStatus.ACCEPTED;
    order.acceptedAt = new Date('2025-01-01T01:00:00Z');
    return order;
  }

  async rejectOrder() {
    return undefined;
  }
}

describe('Orders integration flow', () => {
  let app: INestApplication;
  let ordersService: InMemoryOrdersService;

  beforeAll(async () => {
    ordersService = new InMemoryOrdersService();
    const dispatchService = new InMemoryDispatchService(ordersService);

    const moduleBuilder = Test.createTestingModule({
      controllers: [
        OrdersController,
        ExecutorOrdersController,
        DispatchController,
      ],
      providers: [
        {
          provide: OrdersService,
          useValue: ordersService,
        },
        {
          provide: DispatchService,
          useValue: dispatchService,
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

  it('covers create -> incoming -> accept -> complete -> rate flow for taxi orders', async () => {
    const createResponse = await request(app.getHttpAdapter().getInstance())
      .post('/api/v1/orders')
      .set('x-user-id', 'client-1')
      .set('x-user-role', 'client')
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
      })
      .expect(201);

    const orderId = createResponse.body.id;
    expect(createResponse.body.promoCodeId).toBeNull();
    expect(createResponse.body.discountAmount).toBe('0.00');

    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/executor/orders/incoming')
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .expect(200)
      .expect((response) => {
        expect(response.body[0].orderId).toBe(orderId);
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/orders/active')
      .set('x-user-id', 'client-1')
      .set('x-user-role', 'client')
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(orderId);
        expect(response.body.status).toBe(OrderStatus.SEARCHING);
      });

    await request(app.getHttpAdapter().getInstance())
      .post(`/api/v1/executor/orders/${orderId}/accept`)
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .expect(201);

    await request(app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${orderId}/status`)
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .send({
        status: OrderStatus.IN_PROGRESS,
      })
      .expect(200);

    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/executor/orders/active')
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe(orderId);
        expect(response.body.status).toBe(OrderStatus.IN_PROGRESS);
      });

    await request(app.getHttpAdapter().getInstance())
      .patch(`/api/v1/executor/orders/${orderId}/status`)
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .send({
        status: OrderStatus.COMPLETED,
      })
      .expect(200);

    await request(app.getHttpAdapter().getInstance())
      .post(`/api/v1/orders/${orderId}/rate`)
      .set('x-user-id', 'client-1')
      .set('x-user-role', 'client')
      .send({
        executorRating: 5,
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.status).toBe(OrderStatus.COMPLETED);
        expect(response.body.executorRating).toBe(5);
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/executor/orders/history')
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .expect(200)
      .expect((response) => {
        expect(response.body.items[0].id).toBe(orderId);
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/executor/orders/active')
      .set('x-user-id', 'executor-1')
      .set('x-user-role', 'executor')
      .expect(404)
      .expect((response) => {
        expect(response.body.code).toBe('EXECUTOR_ACTIVE_ORDER_NOT_FOUND');
      });

    await request(app.getHttpAdapter().getInstance())
      .get('/api/v1/orders/active')
      .set('x-user-id', 'client-1')
      .set('x-user-role', 'client')
      .expect(404)
      .expect((response) => {
        expect(response.body.code).toBe('CLIENT_ACTIVE_ORDER_NOT_FOUND');
      });
  });

  describe.each([
    CourierVehicleType.BICYCLE,
    CourierVehicleType.CAR,
    CourierVehicleType.MOPED,
    CourierVehicleType.SCOOTER,
  ])('delivery courier type %s', (vehicleType) => {
    it(`creates a ${vehicleType} delivery order and completes pickup -> at-door -> delivered flow`, async () => {
      const createResponse = await request(app.getHttpAdapter().getInstance())
        .post('/api/v1/orders')
        .set('x-user-id', `client-${vehicleType}`)
        .set('x-user-role', 'client')
        .send({
          serviceType: ServiceType.DELIVERY,
          cityId: TEST_CITY_ID,
          paymentMethod: PaymentMethod.CASH,
          courierVehicleType: vehicleType,
          packageDescription: 'Documents',
          isFragile: false,
          requiresReturn: false,
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
              contactName: 'Dana',
              contactPhone: '+77010000001',
            },
          ],
        })
        .expect(201);

      const orderId = createResponse.body.id;

      await request(app.getHttpAdapter().getInstance())
        .post(`/api/v1/executor/orders/${orderId}/accept`)
        .set('x-user-id', `executor-${vehicleType}`)
        .set('x-user-role', 'executor')
        .expect(201);

      await request(app.getHttpAdapter().getInstance())
        .patch(`/api/v1/executor/orders/${orderId}/delivery/pickup`)
        .set('x-user-id', `executor-${vehicleType}`)
        .set('x-user-role', 'executor')
        .expect(200)
        .expect((response) => {
          expect(response.body.deliveryDetails.deliveryStatus).toBe(
            DeliveryStatus.PICKED_UP,
          );
        });

      await request(app.getHttpAdapter().getInstance())
        .patch(`/api/v1/executor/orders/${orderId}/delivery/at-door`)
        .set('x-user-id', `executor-${vehicleType}`)
        .set('x-user-role', 'executor')
        .expect(200)
        .expect((response) => {
          expect(response.body.deliveryDetails.deliveryStatus).toBe(
            DeliveryStatus.AT_DOOR,
          );
        });

      await request(app.getHttpAdapter().getInstance())
        .patch(`/api/v1/executor/orders/${orderId}/delivery/complete`)
        .set('x-user-id', `executor-${vehicleType}`)
        .set('x-user-role', 'executor')
        .send({
          proofPhoto: 'https://cdn.example/proof.jpg',
          recipientCode: '1234',
        })
        .expect(200)
        .expect((response) => {
          expect(response.body.status).toBe(OrderStatus.COMPLETED);
          expect(response.body.deliveryDetails.deliveryStatus).toBe(
            DeliveryStatus.DELIVERED_CONFIRMED,
          );
        });
    });
  });
});

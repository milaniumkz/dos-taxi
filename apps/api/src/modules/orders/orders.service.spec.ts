import {
  CourierVehicleType,
  Currency,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from "@dos/shared-types";
import { Repository } from "typeorm";

import { CityEntity } from "../admin/entities/city.entity";
import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { DispatchQueueService } from "../dispatch/dispatch-queue.service";
import { DriverBonusPayoutEntity } from "../executors/entities/driver-bonus-payout.entity";
import { DriverBonusSettingEntity } from "../executors/entities/driver-bonus-setting.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { GeoService } from "../geo/geo.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PricingService } from "../pricing/pricing.service";
import { UserEntity } from "../users/entities/user.entity";

import { CreateOrderDto } from "./dto/create-order.dto";
import { OrderStatusEventEntity } from "./entities/order-status-event.entity";
import { OrderEntity } from "./entities/order.entity";
import { RoutePointEntity } from "./entities/route-point.entity";
import { OrdersRealtimeService } from "./orders-realtime.service";
import { OrdersService } from "./orders.service";

describe("OrdersService.transition", () => {
  let ordersService: OrdersService;
  let citiesRepository: jest.Mocked<Repository<CityEntity>>;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let routePointsRepository: jest.Mocked<Repository<RoutePointEntity>>;
  let orderStatusEventsRepository: jest.Mocked<
    Repository<OrderStatusEventEntity>
  >;
  let deliveryDetailsRepository: jest.Mocked<Repository<DeliveryDetailEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;
  let driverBonusSettingsRepository: jest.Mocked<
    Repository<DriverBonusSettingEntity>
  >;
  let driverBonusPayoutsRepository: jest.Mocked<
    Repository<DriverBonusPayoutEntity>
  >;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let geoService: jest.Mocked<GeoService>;
  let pricingService: jest.Mocked<PricingService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let ordersRealtimeService: jest.Mocked<OrdersRealtimeService>;
  let dispatchQueueService: jest.Mocked<DispatchQueueService>;

  beforeEach(() => {
    citiesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CityEntity>>;
    ordersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;
    routePointsRepository = {
      create: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<RoutePointEntity>>;
    orderStatusEventsRepository = {
      save: jest.fn(),
      create: jest.fn((value) => value),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderStatusEventEntity>>;
    deliveryDetailsRepository = {
      save: jest.fn(),
      create: jest.fn((value) => value),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<DeliveryDetailEntity>>;
    executorsRepository = {
      decrement: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;
    driverBonusSettingsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<DriverBonusSettingEntity>>;
    driverBonusPayoutsRepository = {
      save: jest.fn(),
      create: jest.fn((value) => value),
    } as unknown as jest.Mocked<Repository<DriverBonusPayoutEntity>>;
    usersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    geoService = {
      route: jest.fn(),
    } as unknown as jest.Mocked<GeoService>;
    pricingService = {
      estimate: jest.fn(),
      calculateExecutorCommission: jest.fn(),
    } as unknown as jest.Mocked<PricingService>;
    notificationsService = {
      send: jest.fn(),
      sendSms: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;
    ordersRealtimeService = {
      emitOrderStatusChanged: jest.fn(),
    } as unknown as jest.Mocked<OrdersRealtimeService>;
    dispatchQueueService = {
      enqueueDispatchOrder: jest.fn(),
    } as unknown as jest.Mocked<DispatchQueueService>;

    ordersService = new OrdersService(
      citiesRepository,
      ordersRepository,
      routePointsRepository,
      orderStatusEventsRepository,
      deliveryDetailsRepository,
      executorsRepository,
      driverBonusSettingsRepository,
      driverBonusPayoutsRepository,
      usersRepository,
      geoService,
      pricingService,
      notificationsService,
      ordersRealtimeService,
      dispatchQueueService,
      {} as import("../promo-codes/promo-codes.service").PromoCodesService,
    );
  });

  it("moves a searching order to accepted and stamps acceptedAt", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CARD,
      estimatedPrice: "1550.00",
      finalPrice: null,
      distanceMeters: 5400,
      durationSeconds: 960,
      executorId: null,
      promoCodeId: null,
      discountAmount: "0.00",
      scheduledAt: null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      clientRating: null,
      executorRating: null,
      createdAt: new Date("2025-01-01T10:00:00Z"),
      updatedAt: new Date("2025-01-01T10:00:00Z"),
    } as OrderEntity;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockImplementation(
      async (value) => value as OrderEntity,
    );
    usersRepository.findOne.mockResolvedValue({
      id: "client-1",
      preferredLanguage: "ru",
    } as UserEntity);

    const result = await ordersService.transition(
      "order-1",
      OrderStatus.ACCEPTED,
      "executor-1",
    );

    expect(result.status).toBe(OrderStatus.ACCEPTED);
    expect(result.acceptedAt).toBeInstanceOf(Date);
    expect(orderStatusEventsRepository.save).toHaveBeenCalled();
    expect(ordersRealtimeService.emitOrderStatusChanged).toHaveBeenCalledWith({
      orderId: "order-1",
      status: OrderStatus.ACCEPTED,
      executorId: null,
    });
    expect(notificationsService.send).toHaveBeenCalledWith(
      "client-1",
      "order_accepted",
      expect.objectContaining({
        orderId: "order-1",
        status: OrderStatus.ACCEPTED,
      }),
      "ru",
    );
  });

  it("throws on invalid transition", async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: "order-1",
      status: OrderStatus.COMPLETED,
    } as OrderEntity);

    await expect(
      ordersService.transition("order-1", OrderStatus.SEARCHING, "client-1"),
    ).rejects.toMatchObject({
      response: {
        code: "INVALID_STATUS_TRANSITION",
      },
    });
  });

  it("notifies client when driver arrived at pickup point", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.ARRIVING,
      executorId: "executor-1",
    } as OrderEntity;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockImplementation(
      async (value) => value as OrderEntity,
    );
    usersRepository.findOne.mockResolvedValue({
      id: "client-1",
      preferredLanguage: "ru",
    } as UserEntity);

    await ordersService.transition(
      "order-1",
      OrderStatus.WAITING,
      "executor-user-1",
    );

    expect(notificationsService.send).toHaveBeenCalledWith(
      "client-1",
      "order_waiting",
      expect.objectContaining({
        orderId: "order-1",
        status: OrderStatus.WAITING,
      }),
      "ru",
    );
  });

  it("notifies client when taxi trip starts", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.WAITING,
      executorId: "executor-1",
      startedAt: null,
    } as OrderEntity;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockImplementation(
      async (value) => value as OrderEntity,
    );
    usersRepository.findOne.mockResolvedValue({
      id: "client-1",
      preferredLanguage: "ru",
    } as UserEntity);

    await ordersService.transition(
      "order-1",
      OrderStatus.IN_PROGRESS,
      "executor-user-1",
    );

    expect(notificationsService.send).toHaveBeenCalledWith(
      "client-1",
      "order_started",
      expect.objectContaining({
        orderId: "order-1",
        status: OrderStatus.IN_PROGRESS,
      }),
      "ru",
    );
  });

  it("notifies executor when client cancels assigned order", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.ACCEPTED,
      executorId: "executor-1",
      cancelledAt: null,
      cancelReason: null,
    } as OrderEntity;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockImplementation(
      async (value) => value as OrderEntity,
    );
    usersRepository.findOne.mockResolvedValue({
      id: "client-1",
      preferredLanguage: "ru",
    } as UserEntity);
    executorsRepository.findOne.mockResolvedValue({
      id: "executor-1",
      userId: "executor-user-1",
      user: {
        id: "executor-user-1",
        preferredLanguage: "ru",
      },
    } as ExecutorEntity);

    await ordersService.transition(
      "order-1",
      OrderStatus.CANCELLED_CLIENT,
      "client-1",
      { reason: "Передумал" },
    );

    expect(notificationsService.send).toHaveBeenCalledWith(
      "executor-user-1",
      "order_cancelled",
      expect.objectContaining({
        orderId: "order-1",
        status: OrderStatus.CANCELLED_CLIENT,
      }),
      "ru",
    );
  });

  it("uses executor taximeter distance when completing a taxi order", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      executorId: "executor-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.IN_PROGRESS,
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CARD,
      estimatedPrice: "1290.00",
      finalPrice: null,
      distanceMeters: 5200,
      durationSeconds: 900,
      promoCodeId: null,
      discountAmount: "0.00",
      scheduledAt: null,
      acceptedAt: new Date("2025-01-01T10:00:00Z"),
      startedAt: new Date("2025-01-01T10:05:00Z"),
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      clientRating: null,
      executorRating: null,
      createdAt: new Date("2025-01-01T10:00:00Z"),
      updatedAt: new Date("2025-01-01T10:00:00Z"),
    } as OrderEntity;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockImplementation(
      async (value) => value as OrderEntity,
    );
    routePointsRepository.find.mockResolvedValue([
      {
        orderId: order.id,
        sequenceIndex: 0,
        lat: 43.238949,
        lng: 76.889709,
        address: "Abay Ave 10",
      },
      {
        orderId: order.id,
        sequenceIndex: 1,
        lat: 43.245,
        lng: 76.95,
        address: "Dostyk Ave 15",
      },
    ] as RoutePointEntity[]);
    orderStatusEventsRepository.findOne.mockResolvedValue({
      orderId: order.id,
      metadata: { lat: 43.238949, lng: 76.889709 },
    } as unknown as OrderStatusEventEntity);
    executorsRepository.findOne.mockResolvedValue({
      id: "executor-1",
      carClass: "comfort",
    } as ExecutorEntity);
    usersRepository.findOne.mockResolvedValue({
      id: "client-1",
      preferredLanguage: "ru",
    } as UserEntity);
    pricingService.estimate.mockResolvedValue({
      tariffId: "tariff-1",
      serviceType: ServiceType.TAXI,
      vehicleClass: "comfort",
      currency: Currency.KZT,
      estimatedPrice: 2100,
      basePrice: 900,
      surchargeAmount: 0,
      surgeCoefficient: 1,
      nightCoefficient: 1,
      distanceMeters: 7800,
      durationSeconds: 600,
      etaSeconds: 600,
    });
    pricingService.calculateExecutorCommission.mockResolvedValue({
      tariffId: "tariff-1",
      amount: 315,
      percent: 15,
      fixed: 0,
      currency: Currency.KZT,
    });

    const result = await ordersService.transition(
      "order-1",
      OrderStatus.COMPLETED,
      "executor-user-1",
      {
        actualDistanceMeters: 7800,
        lat: 43.245,
        lng: 76.95,
      },
    );

    expect(geoService.route).not.toHaveBeenCalled();
    expect(pricingService.estimate).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceType: ServiceType.TAXI,
        carClass: "comfort",
        distanceMeters: 7800,
      }),
    );
    expect(result.distanceMeters).toBe(7800);
    expect(result.finalPrice).toBe("2100.00");
    expect(executorsRepository.decrement).toHaveBeenCalledWith(
      { id: "executor-1" },
      "balance",
      "315.00",
    );
    expect(notificationsService.send).toHaveBeenCalledWith(
      "client-1",
      "order_completed",
      expect.objectContaining({
        orderId: "order-1",
        status: OrderStatus.COMPLETED,
      }),
      "ru",
    );
  });

  it("ignores zero taximeter distance and charges commission from the real order amount", async () => {
    const order = {
      id: "order-1",
      clientId: "client-1",
      executorId: "executor-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.IN_PROGRESS,
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CASH,
      estimatedPrice: "5200.00",
      finalPrice: null,
      distanceMeters: 16000,
      durationSeconds: 1800,
      promoCodeId: null,
      discountAmount: "0.00",
      scheduledAt: null,
      acceptedAt: new Date("2025-01-01T10:00:00Z"),
      startedAt: new Date("2025-01-01T10:05:00Z"),
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      clientRating: null,
      executorRating: null,
      createdAt: new Date("2025-01-01T10:00:00Z"),
      updatedAt: new Date("2025-01-01T10:00:00Z"),
    } as OrderEntity;

    ordersRepository.findOne.mockResolvedValue(order);
    ordersRepository.save.mockImplementation(
      async (value) => value as OrderEntity,
    );
    routePointsRepository.find.mockResolvedValue([
      {
        orderId: order.id,
        sequenceIndex: 0,
        lat: 43.238949,
        lng: 76.889709,
        address: "Pickup",
      },
      {
        orderId: order.id,
        sequenceIndex: 1,
        lat: 43.245,
        lng: 76.95,
        address: "Destination",
      },
    ] as RoutePointEntity[]);
    orderStatusEventsRepository.findOne.mockResolvedValue({
      orderId: order.id,
      metadata: { lat: 43.238949, lng: 76.889709 },
    } as unknown as OrderStatusEventEntity);
    geoService.route.mockResolvedValue({
      polyline: "",
      points: [],
      distanceMeters: 16000,
      durationSeconds: 1800,
    });
    executorsRepository.findOne.mockResolvedValue({
      id: "executor-1",
      carClass: "economy",
      balance: "1000.00",
    } as ExecutorEntity);
    usersRepository.findOne.mockResolvedValue({
      id: "client-1",
      preferredLanguage: "ru",
    } as UserEntity);
    pricingService.estimate.mockResolvedValue({
      tariffId: "tariff-1",
      serviceType: ServiceType.TAXI,
      vehicleClass: "economy",
      currency: Currency.KZT,
      estimatedPrice: 900,
      basePrice: 900,
      surchargeAmount: 0,
      surgeCoefficient: 1,
      nightCoefficient: 1,
      distanceMeters: 16000,
      durationSeconds: 1800,
      etaSeconds: 1800,
    });
    pricingService.calculateExecutorCommission.mockResolvedValue({
      tariffId: "tariff-1",
      amount: 520,
      percent: 10,
      fixed: 0,
      currency: Currency.KZT,
    });

    await ordersService.transition(
      "order-1",
      OrderStatus.COMPLETED,
      "executor-user-1",
      {
        actualDistanceMeters: 0,
        lat: 43.245,
        lng: 76.95,
      },
    );

    expect(geoService.route).toHaveBeenCalled();
    expect(pricingService.calculateExecutorCommission).toHaveBeenCalledWith(
      expect.objectContaining({
        orderAmount: 5200,
      }),
    );
    expect(executorsRepository.decrement).toHaveBeenCalledWith(
      { id: "executor-1" },
      "balance",
      "520.00",
    );
  });

  it.each([
    CourierVehicleType.BICYCLE,
    CourierVehicleType.CAR,
    CourierVehicleType.MOPED,
    CourierVehicleType.SCOOTER,
  ])(
    "creates delivery order for %s and persists delivery details",
    async (vehicleType) => {
      const city = {
        id: "city-1",
        isActive: true,
        serviceZone: null,
      } as CityEntity;
      let persistedOrder = {
        id: "order-1",
        clientId: "client-1",
        serviceType: ServiceType.DELIVERY,
        status: OrderStatus.DRAFT,
        cityId: "city-1",
        currency: Currency.KZT,
        paymentMethod: PaymentMethod.CARD,
        estimatedPrice: "2200.00",
        finalPrice: null,
        distanceMeters: 6400,
        durationSeconds: 1200,
        executorId: null,
        promoCodeId: null,
        discountAmount: "0.00",
        scheduledAt: null,
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        clientRating: null,
        executorRating: null,
        createdAt: new Date("2025-01-02T10:00:00Z"),
        updatedAt: new Date("2025-01-02T10:00:00Z"),
      } as OrderEntity;
      const dto: CreateOrderDto = {
        serviceType: ServiceType.DELIVERY,
        paymentMethod: PaymentMethod.CARD,
        cityId: "city-1",
        courierVehicleType: vehicleType,
        packageDescription: "Documents",
        routePoints: [
          {
            sequenceIndex: 0,
            lat: 43.238949,
            lng: 76.889709,
            address: "Abay Ave 10",
          },
          {
            sequenceIndex: 1,
            lat: 43.245,
            lng: 76.95,
            address: "Dostyk Ave 15",
          },
        ],
      };

      citiesRepository.findOne
        .mockResolvedValueOnce(city)
        .mockResolvedValueOnce(city);
      geoService.route.mockResolvedValue({
        polyline: "encoded",
        points: [
          { lat: 43.238949, lng: 76.889709 },
          { lat: 43.245, lng: 76.95 },
        ],
        distanceMeters: 6400,
        durationSeconds: 1200,
      });
      pricingService.estimate.mockResolvedValue({
        tariffId: "tariff-1",
        serviceType: ServiceType.DELIVERY,
        vehicleClass: null,
        currency: Currency.KZT,
        estimatedPrice: 2200,
        basePrice: 1800,
        surchargeAmount: 400,
        surgeCoefficient: 1,
        nightCoefficient: 1,
        distanceMeters: 6400,
        durationSeconds: 1200,
        etaSeconds: 1200,
      });
      ordersRepository.create.mockImplementation(
        (value) => value as OrderEntity,
      );
      ordersRepository.findOne.mockImplementation(async (options) => {
        const where = options?.where as
          | { id?: string; clientId?: string }
          | undefined;
        if (where?.id === persistedOrder.id) {
          return persistedOrder;
        }
        return null;
      });
      ordersRepository.save.mockImplementation(async (value) => {
        const nextValue = value as Partial<OrderEntity>;
        if (!persistedOrder.id && nextValue.id) {
          persistedOrder = nextValue as OrderEntity;
          return persistedOrder;
        }
        persistedOrder = {
          ...persistedOrder,
          ...nextValue,
          id: persistedOrder.id,
        };
        return persistedOrder;
      });
      routePointsRepository.create.mockImplementation(
        (value) => value as RoutePointEntity,
      );
      (routePointsRepository.save as unknown as jest.Mock).mockImplementation(
        async (value: RoutePointEntity[]) => value,
      );
      routePointsRepository.find.mockResolvedValue([
        {
          orderId: persistedOrder.id,
          sequenceIndex: 0,
          lat: 43.238949,
          lng: 76.889709,
          address: "Abay Ave 10",
        },
        {
          orderId: persistedOrder.id,
          sequenceIndex: 1,
          lat: 43.245,
          lng: 76.95,
          address: "Dostyk Ave 15",
        },
      ] as RoutePointEntity[]);
      deliveryDetailsRepository.create.mockImplementation(
        (value) => value as DeliveryDetailEntity,
      );
      deliveryDetailsRepository.save.mockImplementation(
        async (value) => value as DeliveryDetailEntity,
      );
      deliveryDetailsRepository.findOne.mockResolvedValue({
        orderId: persistedOrder.id,
        courierVehicleType: vehicleType,
        packageDescription: "Documents",
        packagePhotoUrl: null,
        declaredValue: null,
        isFragile: false,
        requiresReturn: false,
        cashOnDelivery: null,
        deliveryStatus: "pending_pickup",
        proofPhotoUrl: null,
        proofSignatureUrl: null,
        recipientCode: null,
      } as DeliveryDetailEntity);

      const result = await ordersService.createOrder("client-1", dto);

      expect(result.serviceType).toBe(ServiceType.DELIVERY);
      expect(result.status).toBe(OrderStatus.SEARCHING);
      expect(result.deliveryDetails?.courierVehicleType).toBe(vehicleType);
      expect(deliveryDetailsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "order-1",
          courierVehicleType: vehicleType,
          packageDescription: "Documents",
        }),
      );
      expect(dispatchQueueService.enqueueDispatchOrder).toHaveBeenCalledWith(
        "order-1",
      );
    },
  );
});

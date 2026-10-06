import {
  Currency,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from "@dos/shared-types";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { ExecutorLocationEntity } from "../executors/entities/executor-location.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrderStatusEventEntity } from "../orders/entities/order-status-event.entity";
import { RoutePointEntity } from "../orders/entities/route-point.entity";
import { OrdersService } from "../orders/orders.service";
import { UserEntity } from "../users/entities/user.entity";

import { DispatchQueueService } from "./dispatch-queue.service";
import { DispatchRealtimeService } from "./dispatch-realtime.service";
import { DispatchService } from "./dispatch.service";
import { DispatchOfferEntity } from "./entities/dispatch-offer.entity";

describe("DispatchService ranking", () => {
  let dispatchService: DispatchService;
  let ordersRepository: jest.Mocked<Repository<OrderEntity>>;
  let orderStatusEventsRepository: jest.Mocked<
    Repository<OrderStatusEventEntity>
  >;
  let routePointsRepository: jest.Mocked<Repository<RoutePointEntity>>;
  let dispatchOffersRepository: jest.Mocked<Repository<DispatchOfferEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;
  let executorLocationsRepository: jest.Mocked<
    Repository<ExecutorLocationEntity>
  >;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let deliveryDetailsRepository: jest.Mocked<Repository<DeliveryDetailEntity>>;
  let redisStoreService: jest.Mocked<RedisStoreService>;
  let configService: jest.Mocked<ConfigService>;
  let dispatchRealtimeService: jest.Mocked<DispatchRealtimeService>;
  let dispatchQueueService: jest.Mocked<DispatchQueueService>;
  let ordersService: jest.Mocked<OrdersService>;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(() => {
    ordersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;
    orderStatusEventsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderStatusEventEntity>>;
    routePointsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<RoutePointEntity>>;
    dispatchOffersRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((value) => value),
    } as unknown as jest.Mocked<Repository<DispatchOfferEntity>>;
    executorsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;
    executorLocationsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorLocationEntity>>;
    usersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    deliveryDetailsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<DeliveryDetailEntity>>;
    redisStoreService = {
      listJsonByPattern: jest.fn(),
      setJson: jest.fn(),
      getJson: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;
    configService = {
      get: jest.fn().mockReturnValue("5"),
    } as unknown as jest.Mocked<ConfigService>;
    dispatchRealtimeService = {
      emitIncomingOrder: jest.fn(),
    } as unknown as jest.Mocked<DispatchRealtimeService>;
    dispatchQueueService = {
      scheduleOfferTimeout: jest.fn(),
      scheduleRetry: jest.fn(),
      enqueueDispatchOrder: jest.fn(),
    } as unknown as jest.Mocked<DispatchQueueService>;
    ordersService = {
      transition: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;
    notificationsService = {
      send: jest.fn(),
    } as unknown as jest.Mocked<NotificationsService>;
    dispatchOffersRepository.findOne.mockResolvedValue(null);
    orderStatusEventsRepository.findOne.mockResolvedValue({
      metadata: { carClass: "economy" },
    } as unknown as OrderStatusEventEntity);
    executorLocationsRepository.find.mockResolvedValue([]);

    dispatchService = new DispatchService(
      ordersRepository,
      orderStatusEventsRepository,
      routePointsRepository,
      dispatchOffersRepository,
      executorsRepository,
      executorLocationsRepository,
      usersRepository,
      deliveryDetailsRepository,
      redisStoreService,
      configService,
      dispatchRealtimeService,
      dispatchQueueService,
      ordersService,
      notificationsService,
    );
  });

  it("offers the closest and best-rated driver first", async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: "order-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
      estimatedPrice: "1500.00",
      distanceMeters: 5400,
      durationSeconds: 960,
      executorId: null,
      clientId: "client-1",
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CARD,
    } as OrderEntity);
    routePointsRepository.find.mockResolvedValue([
      {
        orderId: "order-1",
        sequenceIndex: 0,
        lat: 43.238949,
        lng: 76.889709,
        address: "Abay Ave 10",
      } as RoutePointEntity,
      {
        orderId: "order-1",
        sequenceIndex: 1,
        lat: 43.245,
        lng: 76.95,
        address: "Dostyk Ave 15",
      } as RoutePointEntity,
    ]);
    redisStoreService.listJsonByPattern.mockResolvedValue([
      {
        executorId: "driver-near",
        lat: 43.2391,
        lng: 76.8899,
        isOnline: true,
      },
      {
        executorId: "driver-far",
        lat: 43.268,
        lng: 76.94,
        isOnline: true,
      },
    ]);
    executorsRepository.find.mockResolvedValue([
      {
        id: "driver-near",
        userId: "user-1",
        executorType: ExecutorType.DRIVER,
        isOnline: true,
        verificationStatus: "verified",
        rating: "4.90",
        cancelRate: "2.00",
        balance: "500.00",
      } as ExecutorEntity,
      {
        id: "driver-far",
        userId: "user-2",
        executorType: ExecutorType.DRIVER,
        isOnline: true,
        verificationStatus: "verified",
        rating: "4.60",
        cancelRate: "1.00",
        balance: "500.00",
      } as ExecutorEntity,
    ]);
    executorsRepository.findOne.mockResolvedValue({
      id: "driver-near",
      userId: "user-1",
      balance: "500.00",
      user: { preferredLanguage: "ru" },
    } as unknown as ExecutorEntity);
    usersRepository.find.mockResolvedValue([
      { id: "user-1", isBlocked: false } as UserEntity,
      { id: "user-2", isBlocked: false } as UserEntity,
    ]);
    redisStoreService.getJson.mockResolvedValue({
      executorIds: ["driver-near", "driver-far"],
      currentIndex: 0,
      attempts: 0,
    });
    (dispatchOffersRepository.save as unknown as jest.Mock).mockImplementation(
      async (value: DispatchOfferEntity) => ({
        ...value,
        id: "offer-1",
      }),
    );

    await dispatchService.findAndAssign("order-1");

    expect(redisStoreService.setJson).toHaveBeenCalled();
    expect(dispatchRealtimeService.emitIncomingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        executorId: "driver-near",
        executorUserId: "user-1",
        orderId: "order-1",
      }),
    );
    expect(dispatchQueueService.scheduleOfferTimeout).toHaveBeenCalled();
    expect(notificationsService.send).toHaveBeenCalledWith(
      "user-1",
      "executor_incoming_order",
      expect.objectContaining({
        orderId: "order-1",
        pickupAddress: "Abay Ave 10",
        destinationAddress: "Dostyk Ave 15",
      }),
      "ru",
    );
  });

  it("falls back to persisted executor locations when Redis has no records", async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: "order-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
      estimatedPrice: "1500.00",
      distanceMeters: 5400,
      durationSeconds: 960,
      executorId: null,
      clientId: "client-1",
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CARD,
    } as OrderEntity);
    routePointsRepository.find.mockResolvedValue([
      {
        orderId: "order-1",
        sequenceIndex: 0,
        lat: 43.238949,
        lng: 76.889709,
        address: "Abay Ave 10",
      } as RoutePointEntity,
      {
        orderId: "order-1",
        sequenceIndex: 1,
        lat: 43.245,
        lng: 76.95,
        address: "Dostyk Ave 15",
      } as RoutePointEntity,
    ]);
    redisStoreService.listJsonByPattern.mockResolvedValue([]);
    executorLocationsRepository.find.mockResolvedValue([
      {
        executorId: "driver-near",
        lat: 43.2391,
        lng: 76.8899,
        heading: null,
        updatedAt: new Date(),
      } as ExecutorLocationEntity,
    ]);
    executorsRepository.find.mockResolvedValue([
      {
        id: "driver-near",
        userId: "user-1",
        executorType: ExecutorType.DRIVER,
        isOnline: true,
        verificationStatus: "verified",
        rating: "4.90",
        cancelRate: "2.00",
        balance: "500.00",
      } as ExecutorEntity,
    ]);
    executorsRepository.findOne.mockResolvedValue({
      id: "driver-near",
      userId: "user-1",
      balance: "500.00",
      user: { preferredLanguage: "ru" },
    } as unknown as ExecutorEntity);
    usersRepository.find.mockResolvedValue([
      { id: "user-1", isBlocked: false } as UserEntity,
    ]);
    redisStoreService.getJson.mockResolvedValue({
      executorIds: ["driver-near"],
      currentIndex: 0,
      attempts: 0,
    });
    (dispatchOffersRepository.save as unknown as jest.Mock).mockImplementation(
      async (value: DispatchOfferEntity) => ({
        ...value,
        id: "offer-1",
      }),
    );

    await dispatchService.findAndAssign("order-1");

    expect(dispatchRealtimeService.emitIncomingOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        executorId: "driver-near",
        executorUserId: "user-1",
        orderId: "order-1",
      }),
    );
  });

  it("does not offer orders to executors with balance below 100 KZT", async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: "order-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
      estimatedPrice: "1500.00",
      distanceMeters: 5400,
      durationSeconds: 960,
      executorId: null,
      clientId: "client-1",
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CARD,
    } as OrderEntity);
    routePointsRepository.find.mockResolvedValue([
      {
        orderId: "order-1",
        sequenceIndex: 0,
        lat: 43.238949,
        lng: 76.889709,
        address: "Abay Ave 10",
      } as RoutePointEntity,
      {
        orderId: "order-1",
        sequenceIndex: 1,
        lat: 43.245,
        lng: 76.95,
        address: "Dostyk Ave 15",
      } as RoutePointEntity,
    ]);
    redisStoreService.listJsonByPattern.mockResolvedValue([
      {
        executorId: "driver-low-balance",
        lat: 43.2391,
        lng: 76.8899,
        isOnline: true,
      },
    ]);
    executorsRepository.find.mockResolvedValue([
      {
        id: "driver-low-balance",
        userId: "user-1",
        executorType: ExecutorType.DRIVER,
        isOnline: true,
        verificationStatus: "verified",
        rating: "5.00",
        cancelRate: "0.00",
        balance: "99.99",
      } as ExecutorEntity,
    ]);
    usersRepository.find.mockResolvedValue([
      { id: "user-1", isBlocked: false } as UserEntity,
    ]);

    await dispatchService.findAndAssign("order-1");

    expect(redisStoreService.setJson).not.toHaveBeenCalled();
    expect(dispatchOffersRepository.save).not.toHaveBeenCalled();
    expect(dispatchRealtimeService.emitIncomingOrder).not.toHaveBeenCalled();
    expect(dispatchQueueService.scheduleRetry).toHaveBeenCalledWith(
      "order-1",
      30_000,
    );
  });

  it("does not create a duplicate offer when one is already pending", async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: "order-1",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
    } as OrderEntity);
    dispatchOffersRepository.findOne.mockResolvedValue({
      id: "offer-existing",
      orderId: "order-1",
      executorId: "driver-near",
      response: null,
      respondedAt: null,
    } as DispatchOfferEntity);

    await dispatchService.findAndAssign("order-1");

    expect(redisStoreService.listJsonByPattern).not.toHaveBeenCalled();
    expect(dispatchOffersRepository.save).not.toHaveBeenCalled();
    expect(dispatchRealtimeService.emitIncomingOrder).not.toHaveBeenCalled();
  });

  it("restarts dispatch by closing pending offers and clearing queue state", async () => {
    ordersRepository.findOne.mockResolvedValue({
      id: "order-2",
      serviceType: ServiceType.TAXI,
      status: OrderStatus.SEARCHING,
      estimatedPrice: "1500.00",
      distanceMeters: 5400,
      durationSeconds: 960,
      executorId: null,
      clientId: "client-2",
      cityId: "city-1",
      currency: Currency.KZT,
      paymentMethod: PaymentMethod.CARD,
    } as OrderEntity);
    dispatchOffersRepository.find.mockResolvedValue([
      {
        id: "offer-1",
        orderId: "order-2",
        executorId: "driver-1",
        response: null,
        respondedAt: null,
      } as DispatchOfferEntity,
    ]);
    (dispatchOffersRepository.save as unknown as jest.Mock).mockImplementation(
      async (value: DispatchOfferEntity[]) => value,
    );

    const findAndAssignSpy = jest
      .spyOn(dispatchService, "findAndAssign")
      .mockResolvedValue();

    await dispatchService.restartDispatch("order-2");

    expect(dispatchOffersRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "offer-1",
        response: "timeout",
      }),
    ]);
    expect(redisStoreService.delete).toHaveBeenCalledWith(
      "dispatch:queue:order-2",
    );
    expect(findAndAssignSpy).toHaveBeenCalledWith("order-2");
  });
});

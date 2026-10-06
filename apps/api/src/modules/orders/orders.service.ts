import { DeliveryStatus, OrderStatus, ServiceType } from "@dos/shared-types";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, QueryFailedError, Repository } from "typeorm";

import { CityEntity } from "../admin/entities/city.entity";
import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { DispatchQueueService } from "../dispatch/dispatch-queue.service";
import { DriverBonusPayoutEntity } from "../executors/entities/driver-bonus-payout.entity";
import { DriverBonusSettingEntity } from "../executors/entities/driver-bonus-setting.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { GeoService } from "../geo/geo.service";
import { NotificationsService } from "../notifications/notifications.service";
import { EstimateResultDto } from "../pricing/dto/estimate-result.dto";
import { PricingService } from "../pricing/pricing.service";
import { UserEntity } from "../users/entities/user.entity";

import { CompleteDeliveryOrderDto } from "./dto/complete-delivery-order.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { EstimateOrderDto } from "./dto/estimate-order.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { OrdersHistoryQueryDto } from "./dto/orders-history-query.dto";
import { OrdersHistoryResponseDto } from "./dto/orders-history-response.dto";
import { UpdateExecutorOrderStatusDto } from "./dto/update-executor-order-status.dto";
import { OrderStatusEventEntity } from "./entities/order-status-event.entity";
import { OrderEntity } from "./entities/order.entity";
import { RoutePointEntity } from "./entities/route-point.entity";
import { OrdersRealtimeService } from "./orders-realtime.service";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(RoutePointEntity)
    private readonly routePointsRepository: Repository<RoutePointEntity>,
    @InjectRepository(OrderStatusEventEntity)
    private readonly orderStatusEventsRepository: Repository<OrderStatusEventEntity>,
    @InjectRepository(DeliveryDetailEntity)
    private readonly deliveryDetailsRepository: Repository<DeliveryDetailEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    @InjectRepository(DriverBonusSettingEntity)
    private readonly driverBonusSettingsRepository: Repository<DriverBonusSettingEntity>,
    @InjectRepository(DriverBonusPayoutEntity)
    private readonly driverBonusPayoutsRepository: Repository<DriverBonusPayoutEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly geoService: GeoService,
    private readonly pricingService: PricingService,
    private readonly notificationsService: NotificationsService,
    private readonly ordersRealtimeService: OrdersRealtimeService,
    @Inject(forwardRef(() => DispatchQueueService))
    private readonly dispatchQueueService: DispatchQueueService,
  ) {}

  async estimate(dto: EstimateOrderDto): Promise<EstimateResultDto> {
    const city = await this.resolveCity(dto.cityId, dto.routePoints);
    return this.pricingService.estimate({
      cityId: city.id,
      serviceType: dto.serviceType,
      vehicleType: dto.courierVehicleType,
      carClass: dto.carClass,
      distanceMeters: dto.distanceMeters,
      durationSeconds: dto.durationSeconds,
      isFragile: dto.isFragile,
      requiresReturn: dto.requiresReturn,
      declaredValue: dto.declaredValue,
      cashOnDelivery: dto.cashOnDelivery,
    });
  }

  async createOrder(
    clientId: string,
    dto: CreateOrderDto,
    orderId?: string,
  ): Promise<OrderResponseDto> {
    if (dto.serviceType === ServiceType.DELIVERY) {
      return this.createDeliveryOrder(clientId, dto, orderId);
    }

    return this.createTaxiOrder(clientId, dto, orderId);
  }

  async createTaxiOrder(
    clientId: string,
    dto: CreateOrderDto,
    orderId?: string,
  ): Promise<OrderResponseDto> {
    if (!this.isDriverRideService(dto.serviceType)) {
      throw new BadRequestException({
        code: "ORDER_SERVICE_UNSUPPORTED",
        message: "This endpoint only supports taxi and intercity orders",
      });
    }
    const serviceType = dto.serviceType;

    const routePoints = [...dto.routePoints].sort(
      (left, right) => left.sequenceIndex - right.sequenceIndex,
    );
    const city = await this.resolveCity(dto.cityId, routePoints);
    if (serviceType === ServiceType.INTERCITY) {
      this.assertPickupInServiceZone(city, routePoints);
    } else {
      this.assertPointsInServiceZone(city, routePoints);
    }

    const routeMetrics =
      dto.distanceMeters && dto.durationSeconds
        ? {
            distanceMeters: dto.distanceMeters,
            durationSeconds: dto.durationSeconds,
          }
        : await this.buildRouteMetrics(routePoints);

    const estimate = await this.pricingService.estimate({
      cityId: city.id,
      serviceType,
      carClass: dto.carClass,
      distanceMeters: routeMetrics.distanceMeters,
      durationSeconds: routeMetrics.durationSeconds,
    });

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        id: orderId,
        clientId,
        serviceType,
        status: OrderStatus.DRAFT,
        cityId: city.id,
        currency: estimate.currency,
        estimatedPrice: estimate.estimatedPrice.toFixed(2),
        finalPrice: null,
        distanceMeters: routeMetrics.distanceMeters,
        durationSeconds: routeMetrics.durationSeconds,
        paymentMethod: dto.paymentMethod,
        promoCodeId: null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        executorId: null,
        cancelReason: null,
      }),
    );

    await this.routePointsRepository.save(
      routePoints.map((point) =>
        this.routePointsRepository.create({
          orderId: order.id,
          sequenceIndex: point.sequenceIndex,
          lat: point.lat,
          lng: point.lng,
          address: point.address,
          contactName: point.contactName ?? null,
          contactPhone: point.contactPhone ?? null,
          notes: point.notes ?? null,
        }),
      ),
    );

    await this.recordStatusEvent(order.id, null, OrderStatus.DRAFT, clientId, {
      source: "order_create",
      carClass:
        serviceType === ServiceType.TAXI ? (dto.carClass ?? "economy") : null,
      promoCode: dto.promoCode ?? null,
    });
    await this.transition(order.id, OrderStatus.SEARCHING, clientId, {
      source:
        serviceType === ServiceType.INTERCITY
          ? "create_intercity_order"
          : "create_taxi_order",
    });
    await this.dispatchQueueService.enqueueDispatchOrder(order.id);

    return this.getOrder(clientId, order.id);
  }

  async createDeliveryOrder(
    clientId: string,
    dto: CreateOrderDto,
    orderId?: string,
  ): Promise<OrderResponseDto> {
    if (dto.serviceType !== ServiceType.DELIVERY || !dto.courierVehicleType) {
      throw new BadRequestException({
        code: "ORDER_SERVICE_UNSUPPORTED",
        message: "This endpoint only supports delivery orders",
      });
    }

    if (!dto.packageDescription?.trim()) {
      throw new BadRequestException({
        code: "DELIVERY_PACKAGE_DESCRIPTION_REQUIRED",
        message: "Package description is required",
      });
    }

    const routePoints = [...dto.routePoints].sort(
      (left, right) => left.sequenceIndex - right.sequenceIndex,
    );
    const city = await this.resolveCity(dto.cityId, routePoints);
    this.assertPointsInServiceZone(city, routePoints);

    const routeMetrics =
      dto.distanceMeters && dto.durationSeconds
        ? {
            distanceMeters: dto.distanceMeters,
            durationSeconds: dto.durationSeconds,
          }
        : await this.buildRouteMetrics(routePoints);

    const estimate = await this.pricingService.estimate({
      cityId: city.id,
      serviceType: ServiceType.DELIVERY,
      vehicleType: dto.courierVehicleType,
      distanceMeters: routeMetrics.distanceMeters,
      durationSeconds: routeMetrics.durationSeconds,
      isFragile: dto.isFragile,
      requiresReturn: dto.requiresReturn,
      declaredValue: dto.declaredValue,
      cashOnDelivery: dto.cashOnDelivery,
    });

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        id: orderId,
        clientId,
        serviceType: ServiceType.DELIVERY,
        status: OrderStatus.DRAFT,
        cityId: city.id,
        currency: estimate.currency,
        estimatedPrice: estimate.estimatedPrice.toFixed(2),
        finalPrice: null,
        distanceMeters: routeMetrics.distanceMeters,
        durationSeconds: routeMetrics.durationSeconds,
        paymentMethod: dto.paymentMethod,
        promoCodeId: null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        executorId: null,
        cancelReason: null,
      }),
    );

    await this.routePointsRepository.save(
      routePoints.map((point, index) =>
        this.routePointsRepository.create({
          orderId: order.id,
          sequenceIndex: point.sequenceIndex,
          lat: point.lat,
          lng: point.lng,
          address: point.address,
          contactName:
            point.contactName ??
            (index === routePoints.length - 1
              ? (dto.contactName ?? null)
              : null),
          contactPhone:
            point.contactPhone ??
            (index === routePoints.length - 1
              ? (dto.contactPhone ?? null)
              : null),
          notes: point.notes ?? null,
        }),
      ),
    );

    await this.deliveryDetailsRepository.save(
      this.deliveryDetailsRepository.create({
        orderId: order.id,
        courierVehicleType: dto.courierVehicleType,
        packageDescription: dto.packageDescription.trim(),
        packagePhotoUrl: dto.packagePhoto ?? null,
        declaredValue:
          dto.declaredValue !== undefined ? dto.declaredValue.toFixed(2) : null,
        isFragile: dto.isFragile ?? false,
        requiresReturn: dto.requiresReturn ?? false,
        cashOnDelivery:
          dto.cashOnDelivery !== undefined
            ? dto.cashOnDelivery.toFixed(2)
            : null,
        deliveryStatus: DeliveryStatus.PENDING_PICKUP,
        proofPhotoUrl: null,
        proofSignatureUrl: null,
        recipientCode: dto.recipientCode ?? null,
      }),
    );

    await this.recordStatusEvent(order.id, null, OrderStatus.DRAFT, clientId, {
      source: "delivery_order_create",
      courierVehicleType: dto.courierVehicleType,
      promoCode: dto.promoCode ?? null,
    });
    await this.transition(order.id, OrderStatus.SEARCHING, clientId, {
      source: "create_delivery_order",
    });
    await this.dispatchQueueService.enqueueDispatchOrder(order.id);

    return this.getOrder(clientId, order.id);
  }

  async getOrder(clientId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, clientId },
      order: { createdAt: "DESC" },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    const routePoints = await this.routePointsRepository.find({
      where: { orderId: order.id },
      order: { sequenceIndex: "ASC" },
    });
    const deliveryDetails = await this.getDeliveryDetailsIfNeeded(order);

    return this.withExecutorDetails(
      this.toOrderResponse(order, routePoints, deliveryDetails),
      order,
    );
  }

  async getActiveOrder(clientId: string): Promise<OrderResponseDto | null> {
    const order = await this.ordersRepository.findOne({
      where: {
        clientId,
        status: In([
          OrderStatus.SEARCHING,
          OrderStatus.ACCEPTED,
          OrderStatus.ARRIVING,
          OrderStatus.WAITING,
          OrderStatus.IN_PROGRESS,
          OrderStatus.DELIVERED,
        ]),
      },
      order: {
        createdAt: "DESC",
      },
    });

    if (!order) return null;

    return this.getOrder(clientId, order.id);
  }

  async cancelOrder(
    clientId: string,
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrderEntityForClient(clientId, orderId);
    await this.transition(order.id, OrderStatus.CANCELLED_CLIENT, clientId, {
      reason: reason ?? null,
    });
    return this.getOrder(clientId, orderId);
  }

  async getHistory(
    clientId: string,
    query: OrdersHistoryQueryDto,
  ): Promise<OrdersHistoryResponseDto> {
    const normalizedLimit = Math.min(query.limit || 20, 50);
    const cursor = this.decodeCursor(query.cursor);
    const items = await this.ordersRepository.find({
      where: { clientId },
      order: { createdAt: "DESC" },
      take: 100,
    });
    const filteredItems = cursor
      ? items.filter((order) => {
          if (order.createdAt < cursor.createdAt) {
            return true;
          }

          if (order.createdAt > cursor.createdAt) {
            return false;
          }

          return order.id < cursor.id;
        })
      : items;
    const limitedItems = filteredItems.slice(0, normalizedLimit + 1);

    const paginatedItems = limitedItems.slice(0, normalizedLimit);
    const routePointsByOrderId = new Map<string, RoutePointEntity[]>();
    const deliveryDetailsByOrderId = new Map<string, DeliveryDetailEntity>();
    const allRoutePoints =
      paginatedItems.length === 0
        ? []
        : await this.routePointsRepository.find({
            where: paginatedItems.map((order) => ({ orderId: order.id })),
            order: { sequenceIndex: "ASC" },
          });
    for (const routePoint of allRoutePoints) {
      const current = routePointsByOrderId.get(routePoint.orderId) ?? [];
      current.push(routePoint);
      routePointsByOrderId.set(routePoint.orderId, current);
    }
    const deliveryOrderIds = paginatedItems
      .filter((order) => order.serviceType === ServiceType.DELIVERY)
      .map((order) => order.id);
    if (deliveryOrderIds.length > 0) {
      const deliveryDetails = await this.deliveryDetailsRepository.find({
        where: deliveryOrderIds.map((orderId) => ({ orderId })),
      });
      for (const detail of deliveryDetails) {
        deliveryDetailsByOrderId.set(detail.orderId, detail);
      }
    }

    const nextCursor =
      limitedItems.length > normalizedLimit && paginatedItems.at(-1)
        ? this.encodeCursor(paginatedItems.at(-1)!)
        : null;

    return {
      items: paginatedItems.map((order) =>
        this.toOrderResponse(
          order,
          routePointsByOrderId.get(order.id) ?? [],
          deliveryDetailsByOrderId.get(order.id) ?? null,
        ),
      ),
      nextCursor,
    };
  }

  async getExecutorActiveOrder(
    executorUserId: string,
  ): Promise<OrderResponseDto> {
    const executor = await this.getExecutorByUserId(executorUserId);
    const order = await this.ordersRepository.findOne({
      where: {
        executorId: executor.id,
        status: In([
          OrderStatus.ACCEPTED,
          OrderStatus.ARRIVING,
          OrderStatus.WAITING,
          OrderStatus.IN_PROGRESS,
          OrderStatus.DELIVERED,
        ]),
      },
      order: {
        createdAt: "DESC",
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: "EXECUTOR_ACTIVE_ORDER_NOT_FOUND",
        message: "Executor has no active order",
      });
    }

    return this.getOrderByExecutor(executorUserId, order.id);
  }

  async getExecutorHistory(
    executorUserId: string,
    query: OrdersHistoryQueryDto,
  ): Promise<OrdersHistoryResponseDto> {
    const executor = await this.getExecutorByUserId(executorUserId);
    const normalizedLimit = Math.min(query.limit || 20, 50);
    const cursor = this.decodeCursor(query.cursor);
    const items = await this.ordersRepository.find({
      where: { executorId: executor.id },
      order: { createdAt: "DESC" },
      take: 100,
    });
    const filteredItems = cursor
      ? items.filter((order) => {
          if (order.createdAt < cursor.createdAt) {
            return true;
          }

          if (order.createdAt > cursor.createdAt) {
            return false;
          }

          return order.id < cursor.id;
        })
      : items;
    const limitedItems = filteredItems.slice(0, normalizedLimit + 1);
    const paginatedItems = limitedItems.slice(0, normalizedLimit);
    const routePointsByOrderId = new Map<string, RoutePointEntity[]>();
    const deliveryDetailsByOrderId = new Map<string, DeliveryDetailEntity>();
    const allRoutePoints =
      paginatedItems.length === 0
        ? []
        : await this.routePointsRepository.find({
            where: paginatedItems.map((order) => ({ orderId: order.id })),
            order: { sequenceIndex: "ASC" },
          });
    for (const routePoint of allRoutePoints) {
      const current = routePointsByOrderId.get(routePoint.orderId) ?? [];
      current.push(routePoint);
      routePointsByOrderId.set(routePoint.orderId, current);
    }
    const deliveryOrderIds = paginatedItems
      .filter((order) => order.serviceType === ServiceType.DELIVERY)
      .map((order) => order.id);
    if (deliveryOrderIds.length > 0) {
      const deliveryDetails = await this.deliveryDetailsRepository.find({
        where: deliveryOrderIds.map((orderId) => ({ orderId })),
      });
      for (const detail of deliveryDetails) {
        deliveryDetailsByOrderId.set(detail.orderId, detail);
      }
    }

    const nextCursor =
      limitedItems.length > normalizedLimit && paginatedItems.at(-1)
        ? this.encodeCursor(paginatedItems.at(-1)!)
        : null;

    return {
      items: paginatedItems.map((order) =>
        this.toOrderResponse(
          order,
          routePointsByOrderId.get(order.id) ?? [],
          deliveryDetailsByOrderId.get(order.id) ?? null,
        ),
      ),
      nextCursor,
    };
  }

  async rateOrder(
    clientId: string,
    orderId: string,
    executorRating: number,
    comment?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrderEntityForClient(clientId, orderId);
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        code: "ORDER_NOT_COMPLETED",
        message: "Only completed orders can be rated",
      });
    }

    order.executorRating = executorRating;
    await this.ordersRepository.save(order);
    await this.recordStatusEvent(
      order.id,
      order.status,
      order.status,
      clientId,
      {
        source: "rate_order",
        executorRating,
        comment: comment ?? null,
      },
    );

    return this.getOrder(clientId, orderId);
  }

  async transition(
    orderId: string,
    nextStatus: OrderStatus,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.DRAFT]: [
        OrderStatus.SEARCHING,
        OrderStatus.CANCELLED_CLIENT,
        OrderStatus.CANCELLED_SYSTEM,
      ],
      [OrderStatus.SEARCHING]: [
        OrderStatus.ACCEPTED,
        OrderStatus.CANCELLED_CLIENT,
        OrderStatus.CANCELLED_SYSTEM,
        OrderStatus.FAILED,
      ],
      [OrderStatus.ACCEPTED]: [
        OrderStatus.ARRIVING,
        OrderStatus.IN_PROGRESS,
        OrderStatus.CANCELLED_CLIENT,
        OrderStatus.CANCELLED_EXECUTOR,
        OrderStatus.CANCELLED_SYSTEM,
        OrderStatus.FAILED,
      ],
      [OrderStatus.ARRIVING]: [
        OrderStatus.WAITING,
        OrderStatus.IN_PROGRESS,
        OrderStatus.CANCELLED_CLIENT,
        OrderStatus.CANCELLED_EXECUTOR,
        OrderStatus.FAILED,
      ],
      [OrderStatus.WAITING]: [
        OrderStatus.IN_PROGRESS,
        OrderStatus.CANCELLED_CLIENT,
        OrderStatus.CANCELLED_EXECUTOR,
        OrderStatus.FAILED,
      ],
      [OrderStatus.IN_PROGRESS]: [
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
        OrderStatus.FAILED,
        OrderStatus.CANCELLED_SYSTEM,
      ],
      [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED_CLIENT]: [],
      [OrderStatus.CANCELLED_EXECUTOR]: [],
      [OrderStatus.CANCELLED_SYSTEM]: [],
      [OrderStatus.FAILED]: [],
    };

    const availableTransitions = allowedTransitions[order.status] ?? [];
    if (!availableTransitions.includes(nextStatus)) {
      throw new BadRequestException({
        code: "INVALID_STATUS_TRANSITION",
        message: `Cannot transition order from ${order.status} to ${nextStatus}`,
      });
    }

    const previousStatus = order.status;
    order.status = nextStatus;
    if (nextStatus === OrderStatus.ACCEPTED) {
      order.acceptedAt = new Date();
    }
    if (nextStatus === OrderStatus.IN_PROGRESS) {
      order.startedAt = new Date();
    }
    if (nextStatus === OrderStatus.COMPLETED) {
      order.completedAt = new Date();
      if (this.isDriverRideService(order.serviceType)) {
        await this.applyTaxiTaximeterFinalPrice(
          order,
          metadata,
          order.completedAt,
        );
      } else {
        order.finalPrice = order.estimatedPrice;
      }
      await this.applyExecutorCommission(order);
    }
    if (nextStatus === OrderStatus.DELIVERED) {
      order.completedAt = new Date();
    }
    if (
      nextStatus === OrderStatus.CANCELLED_CLIENT ||
      nextStatus === OrderStatus.CANCELLED_EXECUTOR ||
      nextStatus === OrderStatus.CANCELLED_SYSTEM
    ) {
      order.cancelledAt = new Date();
      order.cancelReason =
        typeof metadata?.reason === "string" ? metadata.reason : null;
    }

    const updated = await this.ordersRepository.save(order);
    if (nextStatus === OrderStatus.COMPLETED) {
      await this.applyDriverCompletionBonus(updated);
    }
    await this.recordStatusEvent(
      order.id,
      previousStatus,
      nextStatus,
      actorId,
      metadata ?? null,
    );
    this.ordersRealtimeService.emitOrderStatusChanged({
      orderId: order.id,
      status: nextStatus,
      executorId: order.executorId,
    });
    await this.notifyOrderStatusChange(updated, nextStatus, metadata);
    return updated;
  }

  private async applyTaxiTaximeterFinalPrice(
    order: OrderEntity,
    metadata: Record<string, unknown> | undefined,
    completedAt: Date,
  ): Promise<void> {
    const routePoints = await this.routePointsRepository.find({
      where: { orderId: order.id },
      order: { sequenceIndex: "ASC" },
    });
    const pickupPoint = routePoints[0];
    const destinationPoint = routePoints.at(-1);
    if (!pickupPoint || !destinationPoint) {
      order.finalPrice = order.estimatedPrice;
      return;
    }

    const startEvent = await this.orderStatusEventsRepository.findOne({
      where: { orderId: order.id, toStatus: OrderStatus.IN_PROGRESS },
      order: { createdAt: "DESC" },
    });
    const startLocation = this.locationFromMetadata(startEvent?.metadata) ?? {
      lat: pickupPoint.lat,
      lng: pickupPoint.lng,
    };
    const finishLocation = this.locationFromMetadata(metadata) ?? {
      lat: destinationPoint.lat,
      lng: destinationPoint.lng,
    };
    const actualDurationSeconds = Math.max(
      60,
      Math.round(
        (completedAt.getTime() - (order.startedAt ?? completedAt).getTime()) /
          1000,
      ),
    );
    const actualDistanceMeters =
      this.distanceFromMetadata(metadata) ??
      (await this.calculateActualDistanceMeters(startLocation, finishLocation));
    const carClass = await this.resolveTaxiCarClass(order);
    const estimate = await this.pricingService.estimate({
      cityId: order.cityId,
      serviceType: order.serviceType,
      carClass,
      distanceMeters: actualDistanceMeters,
      durationSeconds: actualDurationSeconds,
    });

    order.distanceMeters = actualDistanceMeters;
    order.durationSeconds = actualDurationSeconds;
    order.currency = estimate.currency;
    order.finalPrice = estimate.estimatedPrice.toFixed(2);
  }

  private async calculateActualDistanceMeters(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): Promise<number> {
    try {
      const route = await this.geoService.route({ from, to });
      return route.distanceMeters;
    } catch {
      return Math.round(this.distanceMeters(from, to));
    }
  }

  private async resolveTaxiCarClass(order: OrderEntity): Promise<string> {
    if (order.executorId) {
      const executor = await this.executorsRepository.findOne({
        where: { id: order.executorId },
      });
      if (executor?.carClass) {
        return executor.carClass;
      }
    }

    const createEvent = await this.orderStatusEventsRepository.findOne({
      where: { orderId: order.id, toStatus: OrderStatus.DRAFT },
      order: { createdAt: "ASC" },
    });
    const carClass = createEvent?.metadata?.carClass;
    return typeof carClass === "string" && carClass.trim()
      ? carClass.trim()
      : "economy";
  }

  private async applyExecutorCommission(order: OrderEntity): Promise<void> {
    if (!order.executorId) {
      return;
    }

    const executor = await this.executorsRepository.findOne({
      where: { id: order.executorId },
    });
    if (!executor) {
      return;
    }

    const finalAmount = Number(order.finalPrice ?? 0);
    const estimatedAmount = Number(order.estimatedPrice ?? 0);
    const orderAmount = Math.max(
      Number.isFinite(finalAmount) ? finalAmount : 0,
      Number.isFinite(estimatedAmount) ? estimatedAmount : 0,
    );
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return;
    }

    const commission = await this.pricingService.calculateExecutorCommission({
      cityId: order.cityId,
      serviceType: order.serviceType,
      carClass: this.isDriverRideService(order.serviceType)
        ? await this.resolveTaxiCarClass(order)
        : undefined,
      vehicleType:
        order.serviceType === ServiceType.DELIVERY
          ? await this.resolveDeliveryVehicleType(order.id)
          : undefined,
      orderAmount,
      requestedAt: order.completedAt ?? new Date(),
    });
    if (commission.amount <= 0) {
      return;
    }

    const currentBalance = Number(executor.balance ?? 0);
    executor.balance = (
      (Number.isFinite(currentBalance) ? currentBalance : 0) - commission.amount
    ).toFixed(2);
    await this.executorsRepository.save(executor);
    await this.recordStatusEvent(
      order.id,
      order.status,
      order.status,
      order.executorId,
      {
        source: "executor_commission_charged",
        executorId: executor.id,
        tariffId: commission.tariffId,
        commissionAmount: commission.amount,
        commissionPercent: commission.percent,
        commissionFixed: commission.fixed,
        currency: commission.currency,
        balanceAfter: executor.balance,
      },
    );
  }

  private async applyDriverCompletionBonus(order: OrderEntity): Promise<void> {
    if (!order.executorId || order.status !== OrderStatus.COMPLETED) {
      return;
    }

    const settings = await this.driverBonusSettingsRepository.findOne({
      where: { key: "default" },
    });
    if (!settings?.isEnabled || settings.ordersRequired <= 0) {
      return;
    }

    const bonusAmount = Number(settings.bonusAmount);
    if (!Number.isFinite(bonusAmount) || bonusAmount <= 0) {
      return;
    }

    const completedOrders = await this.ordersRepository.count({
      where: {
        executorId: order.executorId,
        status: OrderStatus.COMPLETED,
      },
    });
    const milestone =
      Math.floor(completedOrders / settings.ordersRequired) *
      settings.ordersRequired;
    if (milestone <= 0 || completedOrders < milestone) {
      return;
    }

    const executor = await this.executorsRepository.findOne({
      where: { id: order.executorId },
    });
    if (!executor) {
      return;
    }

    try {
      await this.driverBonusPayoutsRepository.save(
        this.driverBonusPayoutsRepository.create({
          executorId: executor.id,
          orderId: order.id,
          thresholdCompletedOrders: milestone,
          amount: bonusAmount.toFixed(2),
        }),
      );
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string } | undefined)?.code;
        if (code === "23505") {
          return;
        }
      }
      throw error;
    }

    const currentBalance = Number(executor.balance ?? 0);
    executor.balance = (
      (Number.isFinite(currentBalance) ? currentBalance : 0) + bonusAmount
    ).toFixed(2);
    await this.executorsRepository.save(executor);
    await this.recordStatusEvent(
      order.id,
      order.status,
      order.status,
      order.executorId,
      {
        source: "driver_completion_bonus_paid",
        executorId: executor.id,
        completedOrders,
        thresholdCompletedOrders: milestone,
        bonusAmount,
        balanceAfter: executor.balance,
      },
    );
  }

  private async resolveDeliveryVehicleType(
    orderId: string,
  ): Promise<DeliveryDetailEntity["courierVehicleType"] | undefined> {
    const deliveryDetails = await this.deliveryDetailsRepository.findOne({
      where: { orderId },
    });
    return deliveryDetails?.courierVehicleType;
  }

  private locationFromMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): { lat: number; lng: number } | null {
    const lat = Number(metadata?.lat);
    const lng = Number(metadata?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }

  private distanceFromMetadata(
    metadata: Record<string, unknown> | null | undefined,
  ): number | null {
    const distance = Number(metadata?.actualDistanceMeters);
    if (!Number.isFinite(distance) || distance <= 0) {
      return null;
    }
    return Math.round(distance);
  }

  private distanceMeters(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const earthRadius = 6_371_000;
    const dLat = this.degToRad(to.lat - from.lat);
    const dLng = this.degToRad(to.lng - from.lng);
    const fromLat = this.degToRad(from.lat);
    const toLat = this.degToRad(to.lat);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(fromLat) *
        Math.cos(toLat) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private degToRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private async resolveCity(
    cityId?: string,
    routePoints?: Array<{ lat: number; lng: number }>,
  ): Promise<CityEntity> {
    if (cityId) {
      const city = await this.citiesRepository.findOne({
        where: { id: cityId },
      });
      if (city) {
        return city;
      }
    }

    const pickupPoint = routePoints?.[0];
    if (pickupPoint) {
      const activeCities = await this.citiesRepository.find({
        where: { isActive: true },
      });
      const matchedCity = activeCities.find(
        (city) =>
          this.hasCityServiceZone(city) &&
          this.isPointInCityServiceZone(city, pickupPoint),
      );
      if (matchedCity) {
        return matchedCity;
      }
    }

    const activeCity = await this.citiesRepository.findOne({
      where: { isActive: true },
    });
    if (activeCity) {
      return activeCity;
    }

    throw new NotFoundException({
      code: "CITY_NOT_FOUND",
      message: "City not found",
    });
  }

  private assertPointsInServiceZone(
    city: CityEntity,
    routePoints: CreateOrderDto["routePoints"],
  ): void {
    for (const point of routePoints) {
      if (!this.isPointInCityServiceZone(city, point)) {
        throw new BadRequestException({
          code: "ORDER_ROUTE_OUTSIDE_SERVICE_ZONE",
          message: "Route point is outside service zone",
        });
      }
    }
  }

  private assertPickupInServiceZone(
    city: CityEntity,
    routePoints: CreateOrderDto["routePoints"],
  ): void {
    const pickupPoint = routePoints[0];
    if (pickupPoint && !this.isPointInCityServiceZone(city, pickupPoint)) {
      throw new BadRequestException({
        code: "ORDER_PICKUP_OUTSIDE_SERVICE_ZONE",
        message: "Pickup point is outside service zone",
      });
    }
  }

  private isPointInCityServiceZone(
    city: CityEntity,
    point: { lat: number; lng: number },
  ): boolean {
    if (!this.hasCityServiceZone(city)) {
      return true;
    }

    const coordinates = (
      city.serviceZone?.coordinates as number[][][] | undefined
    )?.[0];
    if (!coordinates || coordinates.length < 3) {
      return true;
    }

    return this.isPointInsidePolygon(point.lng, point.lat, coordinates);
  }

  private hasCityServiceZone(city: CityEntity): boolean {
    const coordinates = (
      city.serviceZone?.coordinates as number[][][] | undefined
    )?.[0];
    return Boolean(coordinates && coordinates.length >= 3);
  }

  private async buildRouteMetrics(
    routePoints: CreateOrderDto["routePoints"],
  ): Promise<{ distanceMeters: number; durationSeconds: number }> {
    const [from, ...rest] = routePoints;
    const to = rest.at(-1);
    if (!from || !to) {
      throw new BadRequestException({
        code: "ORDER_ROUTE_INVALID",
        message: "Route must have at least 2 points",
      });
    }

    const waypoints = routePoints.slice(1, -1).map((point) => ({
      lat: point.lat,
      lng: point.lng,
    }));
    const route = await this.geoService.route({
      from: { lat: from.lat, lng: from.lng },
      to: { lat: to.lat, lng: to.lng },
      waypoints,
    });

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    };
  }

  private async recordStatusEvent(
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    actorId?: string,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.orderStatusEventsRepository.save(
      this.orderStatusEventsRepository.create({
        orderId,
        fromStatus,
        toStatus,
        actorId: actorId ?? null,
        metadata: metadata ?? null,
      }),
    );
  }

  private async getOrderEntityForClient(
    clientId: string,
    orderId: string,
  ): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, clientId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    return order;
  }

  private toOrderResponse(
    order: OrderEntity,
    routePoints: RoutePointEntity[],
    deliveryDetails?: DeliveryDetailEntity | null,
  ): OrderResponseDto {
    return {
      id: order.id,
      serviceType: order.serviceType,
      status: order.status,
      cityId: order.cityId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      promoCodeId: order.promoCodeId,
      discountAmount: order.discountAmount,
      executorId: order.executorId,
      estimatedPrice: order.estimatedPrice,
      finalPrice: order.finalPrice,
      distanceMeters: order.distanceMeters,
      durationSeconds: order.durationSeconds,
      carClass:
        routePoints.length > 0 && this.isDriverRideService(order.serviceType)
          ? null
          : null,
      scheduledAt: order.scheduledAt,
      acceptedAt: order.acceptedAt,
      startedAt: order.startedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      executorRating: order.executorRating,
      routePoints: routePoints.map((point) => ({
        sequenceIndex: point.sequenceIndex,
        lat: point.lat,
        lng: point.lng,
        address: point.address,
        contactName: point.contactName ?? undefined,
        contactPhone: point.contactPhone ?? undefined,
        notes: point.notes ?? undefined,
      })),
      deliveryDetails: deliveryDetails
        ? {
            courierVehicleType: deliveryDetails.courierVehicleType,
            packageDescription: deliveryDetails.packageDescription,
            packagePhotoUrl: deliveryDetails.packagePhotoUrl,
            declaredValue: deliveryDetails.declaredValue,
            isFragile: deliveryDetails.isFragile,
            requiresReturn: deliveryDetails.requiresReturn,
            cashOnDelivery: deliveryDetails.cashOnDelivery,
            deliveryStatus: deliveryDetails.deliveryStatus,
            proofPhotoUrl: deliveryDetails.proofPhotoUrl,
            recipientCode: deliveryDetails.recipientCode,
          }
        : undefined,
      createdAt: order.createdAt,
    };
  }

  private async withExecutorDetails(
    response: OrderResponseDto,
    order: OrderEntity,
  ): Promise<OrderResponseDto> {
    if (!order.executorId) {
      return response;
    }

    const executor = await this.executorsRepository.findOne({
      where: { id: order.executorId },
      relations: ["user"],
    });
    if (!executor) {
      return response;
    }

    return {
      ...response,
      executorName: executor.user?.name ?? null,
      executorPhone: executor.user?.phone ?? null,
      executorVehicleLabel: this.buildExecutorVehicleLabel(executor),
      executorVehiclePlate: executor.vehiclePlate,
      executorProfileRating: Number(executor.rating),
    };
  }

  private async withClientDetails(
    response: OrderResponseDto,
    order: OrderEntity,
  ): Promise<OrderResponseDto> {
    const client = await this.usersRepository.findOne({
      where: { id: order.clientId },
    });
    if (!client) {
      return response;
    }

    return {
      ...response,
      clientName: client.name ?? null,
      clientPhone: client.phone ?? null,
    };
  }

  private buildExecutorVehicleLabel(executor: ExecutorEntity): string | null {
    if (executor.vehicleMake || executor.vehicleModel || executor.vehicleYear) {
      return [
        executor.vehicleMake,
        executor.vehicleModel,
        executor.vehicleColor,
        executor.vehicleYear?.toString(),
      ]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(" ");
    }

    if (executor.vehicleType) {
      return executor.vehicleType;
    }

    if (executor.carClass) {
      return executor.carClass;
    }

    return null;
  }

  async updateExecutorOrderStatus(
    executorUserId: string,
    orderId: string,
    dto: UpdateExecutorOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const { executor, order } = await this.getOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    const transitionPath = this.resolveExecutorTransitionPath(
      order,
      dto.status,
    );

    if (transitionPath.length === 0) {
      await this.recordStatusEvent(
        order.id,
        order.status,
        order.status,
        executor.userId,
        {
          source: "executor_status_sync",
          requestedStatus: dto.status,
          lat: dto.lat ?? null,
          lng: dto.lng ?? null,
          heading: dto.heading ?? null,
          photo: dto.photo ?? null,
          actualDistanceMeters: dto.actualDistanceMeters ?? null,
        },
      );
    } else {
      for (const nextStatus of transitionPath) {
        await this.transition(order.id, nextStatus, executor.userId, {
          source: "executor_status_sync",
          requestedStatus: dto.status,
          lat: dto.lat ?? null,
          lng: dto.lng ?? null,
          heading: dto.heading ?? null,
          photo: dto.photo ?? null,
          actualDistanceMeters: dto.actualDistanceMeters ?? null,
        });
      }
    }

    if (
      order.serviceType === ServiceType.DELIVERY &&
      dto.status === OrderStatus.IN_PROGRESS
    ) {
      const deliveryDetails = await this.getRequiredDeliveryDetails(order.id);
      if (deliveryDetails.deliveryStatus !== DeliveryStatus.IN_TRANSIT) {
        deliveryDetails.deliveryStatus = DeliveryStatus.IN_TRANSIT;
        await this.deliveryDetailsRepository.save(deliveryDetails);
      }
    }

    return this.getOrderByExecutor(executor.userId, order.id);
  }

  async markDeliveryPickedUp(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const { executor, order } = await this.getDeliveryOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    const deliveryDetails = await this.getRequiredDeliveryDetails(order.id);
    deliveryDetails.deliveryStatus = DeliveryStatus.PICKED_UP;
    await this.deliveryDetailsRepository.save(deliveryDetails);

    const transitionPath = this.resolveExecutorTransitionPath(
      order,
      OrderStatus.IN_PROGRESS,
    );
    for (const nextStatus of transitionPath) {
      await this.transition(order.id, nextStatus, executor.userId, {
        source: "delivery_pickup",
      });
    }
    await this.recordStatusEvent(
      order.id,
      OrderStatus.IN_PROGRESS,
      OrderStatus.IN_PROGRESS,
      executor.userId,
      {
        source: "delivery_pickup",
        deliveryStatus: DeliveryStatus.PICKED_UP,
      },
    );
    await this.sendDeliveryNotifications(
      order,
      deliveryDetails,
      "delivery_picked_up",
    );

    return this.getOrderByExecutor(executor.userId, order.id);
  }

  async markDeliveryAtDoor(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const { executor, order } = await this.getDeliveryOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    const deliveryDetails = await this.getRequiredDeliveryDetails(order.id);
    if (order.status !== OrderStatus.IN_PROGRESS) {
      const transitionPath = this.resolveExecutorTransitionPath(
        order,
        OrderStatus.IN_PROGRESS,
      );
      for (const nextStatus of transitionPath) {
        await this.transition(order.id, nextStatus, executor.userId, {
          source: "delivery_at_door_prepare",
        });
      }
    }

    deliveryDetails.deliveryStatus = DeliveryStatus.AT_DOOR;
    await this.deliveryDetailsRepository.save(deliveryDetails);
    await this.recordStatusEvent(
      order.id,
      OrderStatus.IN_PROGRESS,
      OrderStatus.IN_PROGRESS,
      executor.userId,
      {
        source: "delivery_at_door",
        deliveryStatus: DeliveryStatus.AT_DOOR,
      },
    );
    await this.sendDeliveryNotifications(
      order,
      deliveryDetails,
      "delivery_at_door",
    );

    return this.getOrderByExecutor(executor.userId, order.id);
  }

  async completeDelivery(
    executorUserId: string,
    orderId: string,
    dto: CompleteDeliveryOrderDto,
  ): Promise<OrderResponseDto> {
    const { executor, order } = await this.getDeliveryOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    const deliveryDetails = await this.getRequiredDeliveryDetails(order.id);

    if (
      deliveryDetails.recipientCode &&
      dto.recipientCode &&
      deliveryDetails.recipientCode !== dto.recipientCode
    ) {
      throw new BadRequestException({
        code: "DELIVERY_RECIPIENT_CODE_INVALID",
        message: "Recipient code does not match",
      });
    }

    deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERED_CONFIRMED;
    deliveryDetails.proofPhotoUrl =
      dto.proofPhoto ?? deliveryDetails.proofPhotoUrl;
    deliveryDetails.recipientCode =
      dto.recipientCode ?? deliveryDetails.recipientCode;
    await this.deliveryDetailsRepository.save(deliveryDetails);

    if (order.status !== OrderStatus.DELIVERED) {
      const pathToDelivered = this.resolveExecutorTransitionPath(
        order,
        OrderStatus.DELIVERED,
      );
      for (const nextStatus of pathToDelivered) {
        await this.transition(order.id, nextStatus, executor.userId, {
          source: "delivery_complete",
        });
      }
    }
    await this.transition(order.id, OrderStatus.COMPLETED, executor.userId, {
      source: "delivery_complete",
    });
    await this.sendDeliveryNotifications(
      order,
      deliveryDetails,
      "delivery_completed",
    );

    return this.getOrderByExecutor(executor.userId, order.id);
  }

  async failDelivery(
    executorUserId: string,
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const { executor, order } = await this.getDeliveryOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    const deliveryDetails = await this.getRequiredDeliveryDetails(order.id);
    deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERY_FAILED;
    await this.deliveryDetailsRepository.save(deliveryDetails);

    if (order.status !== OrderStatus.FAILED) {
      const pathToFailure = this.resolveExecutorTransitionPath(
        order,
        OrderStatus.FAILED,
      );
      for (const nextStatus of pathToFailure) {
        await this.transition(order.id, nextStatus, executor.userId, {
          source: "delivery_failed",
          reason: reason ?? null,
        });
      }
    }
    await this.sendDeliveryNotifications(
      order,
      deliveryDetails,
      "delivery_failed",
      reason,
    );

    return this.getOrderByExecutor(executor.userId, order.id);
  }

  private async getOrderByExecutor(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const { order } = await this.getOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    const routePoints = await this.routePointsRepository.find({
      where: { orderId: order.id },
      order: { sequenceIndex: "ASC" },
    });
    const deliveryDetails = await this.getDeliveryDetailsIfNeeded(order);
    return this.withClientDetails(
      this.toOrderResponse(order, routePoints, deliveryDetails),
      order,
    );
  }

  private async getExecutorByUserId(
    executorUserId: string,
  ): Promise<ExecutorEntity> {
    const executor = await this.executorsRepository.findOne({
      where: { userId: executorUserId },
    });
    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }

    return executor;
  }

  private async getOrderEntityForExecutor(
    executorUserId: string,
    orderId: string,
  ): Promise<{ executor: ExecutorEntity; order: OrderEntity }> {
    const executor = await this.getExecutorByUserId(executorUserId);
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, executorId: executor.id },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    return { executor, order };
  }

  private async getDeliveryOrderEntityForExecutor(
    executorUserId: string,
    orderId: string,
  ): Promise<{ executor: ExecutorEntity; order: OrderEntity }> {
    const payload = await this.getOrderEntityForExecutor(
      executorUserId,
      orderId,
    );
    if (payload.order.serviceType !== ServiceType.DELIVERY) {
      throw new BadRequestException({
        code: "ORDER_SERVICE_UNSUPPORTED",
        message: "Order is not a delivery",
      });
    }

    return payload;
  }

  private async getDeliveryDetailsIfNeeded(
    order: OrderEntity,
  ): Promise<DeliveryDetailEntity | null> {
    if (order.serviceType !== ServiceType.DELIVERY) {
      return null;
    }

    return this.deliveryDetailsRepository.findOne({
      where: { orderId: order.id },
    });
  }

  private async getRequiredDeliveryDetails(
    orderId: string,
  ): Promise<DeliveryDetailEntity> {
    const details = await this.deliveryDetailsRepository.findOne({
      where: { orderId },
    });
    if (!details) {
      throw new NotFoundException({
        code: "DELIVERY_DETAILS_NOT_FOUND",
        message: "Delivery details not found",
      });
    }

    return details;
  }

  private resolveExecutorTransitionPath(
    order: OrderEntity,
    requestedStatus: OrderStatus,
  ): OrderStatus[] {
    if (order.status === requestedStatus) {
      return [];
    }

    switch (requestedStatus) {
      case OrderStatus.ARRIVING:
        return order.status === OrderStatus.ACCEPTED
          ? [OrderStatus.ARRIVING]
          : [];
      case OrderStatus.WAITING:
        if (order.status === OrderStatus.ACCEPTED) {
          return [OrderStatus.ARRIVING, OrderStatus.WAITING];
        }
        if (order.status === OrderStatus.ARRIVING) {
          return [OrderStatus.WAITING];
        }
        return [];
      case OrderStatus.IN_PROGRESS:
        if (order.serviceType === ServiceType.DELIVERY) {
          return order.status === OrderStatus.ACCEPTED
            ? [OrderStatus.IN_PROGRESS]
            : order.status === OrderStatus.IN_PROGRESS
              ? []
              : [OrderStatus.IN_PROGRESS];
        }
        if (order.status === OrderStatus.ACCEPTED) {
          return [
            OrderStatus.ARRIVING,
            OrderStatus.WAITING,
            OrderStatus.IN_PROGRESS,
          ];
        }
        if (order.status === OrderStatus.ARRIVING) {
          return [OrderStatus.WAITING, OrderStatus.IN_PROGRESS];
        }
        if (order.status === OrderStatus.WAITING) {
          return [OrderStatus.IN_PROGRESS];
        }
        return [];
      case OrderStatus.DELIVERED:
        if (order.status === OrderStatus.IN_PROGRESS) {
          return [OrderStatus.DELIVERED];
        }
        if (order.status === OrderStatus.ACCEPTED) {
          return [OrderStatus.IN_PROGRESS, OrderStatus.DELIVERED];
        }
        return [];
      case OrderStatus.COMPLETED:
        if (order.serviceType === ServiceType.DELIVERY) {
          if (order.status === OrderStatus.IN_PROGRESS) {
            return [OrderStatus.DELIVERED, OrderStatus.COMPLETED];
          }
          if (order.status === OrderStatus.DELIVERED) {
            return [OrderStatus.COMPLETED];
          }
        }
        if (order.status === OrderStatus.IN_PROGRESS) {
          return [OrderStatus.COMPLETED];
        }
        if (order.status === OrderStatus.WAITING) {
          return [OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED];
        }
        return [];
      case OrderStatus.FAILED:
        if (
          order.status === OrderStatus.ACCEPTED ||
          order.status === OrderStatus.ARRIVING ||
          order.status === OrderStatus.WAITING ||
          order.status === OrderStatus.IN_PROGRESS
        ) {
          return [OrderStatus.FAILED];
        }
        return [];
      default:
        return [];
    }
  }

  private async sendDeliveryNotifications(
    order: OrderEntity,
    deliveryDetails: DeliveryDetailEntity,
    type:
      | "delivery_picked_up"
      | "delivery_at_door"
      | "delivery_completed"
      | "delivery_failed",
    reason?: string | null,
  ): Promise<void> {
    try {
      const client = await this.usersRepository.findOne({
        where: { id: order.clientId },
      });
      const routePoints = await this.routePointsRepository.find({
        where: { orderId: order.id },
        order: { sequenceIndex: "ASC" },
      });
      const recipient = routePoints.at(-1);
      const lang = client?.preferredLanguage === "kk" ? "kk" : "ru";
      const payload = {
        orderId: order.id,
        recipientSuffix: recipient?.contactName
          ? ` (${recipient.contactName})`
          : "",
        reasonSuffix: reason?.trim() ? `: ${reason.trim()}` : "",
        deliveryStatus: deliveryDetails.deliveryStatus,
      };

      if (client) {
        await this.notificationsService.send(client.id, type, payload, lang);
      }

      if (recipient?.contactPhone) {
        await this.notificationsService.sendSms(
          recipient.contactPhone,
          type,
          payload,
          lang,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown delivery notification error";
      this.logger.warn(
        `Failed to send delivery notifications for order ${order.id}: ${message}`,
      );
    }
  }

  private async notifyOrderStatusChange(
    order: OrderEntity,
    nextStatus: OrderStatus,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const type = this.resolveOrderNotificationType(order, nextStatus);
    if (!type) {
      return;
    }

    const client = await this.usersRepository.findOne({
      where: { id: order.clientId },
    });
    if (!client) {
      return;
    }

    const lang = client.preferredLanguage === "kk" ? "kk" : "ru";
    const reason =
      typeof metadata?.reason === "string" ? metadata.reason.trim() : "";

    try {
      await this.notificationsService.send(
        client.id,
        type,
        {
          orderId: order.id,
          reasonSuffix: reason ? `: ${reason}` : "",
          serviceType: order.serviceType,
          status: nextStatus,
        },
        lang,
      );
      if (nextStatus === OrderStatus.CANCELLED_CLIENT && order.executorId) {
        await this.notifyExecutorOrderCancelled(order, reason);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown order notification error";
      this.logger.warn(
        `Failed to send order notification for ${order.id}/${nextStatus}: ${message}`,
      );
    }
  }

  private async notifyExecutorOrderCancelled(
    order: OrderEntity,
    reason: string,
  ): Promise<void> {
    const executor = await this.executorsRepository.findOne({
      where: { id: order.executorId ?? "" },
      relations: ["user"],
    });
    if (!executor?.userId) {
      return;
    }

    const lang = executor.user?.preferredLanguage === "kk" ? "kk" : "ru";
    await this.notificationsService.send(
      executor.userId,
      "order_cancelled",
      {
        orderId: order.id,
        reasonSuffix: reason ? `: ${reason}` : "",
        serviceType: order.serviceType,
        status: OrderStatus.CANCELLED_CLIENT,
      },
      lang,
    );
  }

  private resolveOrderNotificationType(
    order: OrderEntity,
    status: OrderStatus,
  ):
    | "order_accepted"
    | "order_arriving"
    | "order_waiting"
    | "order_started"
    | "order_completed"
    | "order_cancelled"
    | null {
    switch (status) {
      case OrderStatus.ACCEPTED:
        return "order_accepted";
      case OrderStatus.ARRIVING:
        return "order_arriving";
      case OrderStatus.WAITING:
        return "order_waiting";
      case OrderStatus.IN_PROGRESS:
        return this.isDriverRideService(order.serviceType)
          ? "order_started"
          : null;
      case OrderStatus.COMPLETED:
        return this.isDriverRideService(order.serviceType)
          ? "order_completed"
          : null;
      case OrderStatus.CANCELLED_CLIENT:
      case OrderStatus.CANCELLED_EXECUTOR:
      case OrderStatus.CANCELLED_SYSTEM:
        return "order_cancelled";
      default:
        return null;
    }
  }

  private encodeCursor(order: OrderEntity): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: order.createdAt.toISOString(),
        id: order.id,
      }),
    ).toString("base64url");
  }

  private isDriverRideService(serviceType: ServiceType): boolean {
    return (
      serviceType === ServiceType.TAXI || serviceType === ServiceType.INTERCITY
    );
  }

  private decodeCursor(value?: string): { createdAt: Date; id: string } | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(value, "base64url").toString("utf8"),
      ) as {
        createdAt?: string;
        id?: string;
      };

      if (!parsed.createdAt || !parsed.id) {
        return null;
      }

      return {
        createdAt: new Date(parsed.createdAt),
        id: parsed.id,
      };
    } catch {
      return null;
    }
  }

  private isPointInsidePolygon(
    lng: number,
    lat: number,
    polygon: number[][],
  ): boolean {
    let isInside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [lngI, latI] = polygon[i]!;
      const [lngJ, latJ] = polygon[j]!;
      const intersects =
        latI > lat !== latJ > lat &&
        lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI || 1e-12) + lngI;

      if (intersects) {
        isInside = !isInside;
      }
    }

    return isInside;
  }
}

import {
  CourierVehicleType,
  ExecutorType,
  OrderStatus,
  ServiceType,
} from "@dos/shared-types";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";

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
import {
  DispatchSettingsDto,
  UpdateDispatchSettingsDto,
} from "./dto/dispatch-settings.dto";
import { IncomingDispatchOfferDto } from "./dto/incoming-dispatch-offer.dto";
import { DispatchOfferEntity } from "./entities/dispatch-offer.entity";

type ExecutorLocationRecord = {
  executorId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  isOnline?: boolean;
  updatedAt?: string;
};

type DispatchQueueState = {
  executorIds: string[];
  currentIndex: number;
  attempts: number;
};

const DISPATCH_SETTINGS_KEY = "admin:settings:dispatch";
const MIN_EXECUTOR_DISPATCH_BALANCE = 100;

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(OrderStatusEventEntity)
    private readonly orderStatusEventsRepository: Repository<OrderStatusEventEntity>,
    @InjectRepository(RoutePointEntity)
    private readonly routePointsRepository: Repository<RoutePointEntity>,
    @InjectRepository(DispatchOfferEntity)
    private readonly dispatchOffersRepository: Repository<DispatchOfferEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    @InjectRepository(ExecutorLocationEntity)
    private readonly executorLocationsRepository: Repository<ExecutorLocationEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(DeliveryDetailEntity)
    private readonly deliveryDetailsRepository: Repository<DeliveryDetailEntity>,
    private readonly redisStoreService: RedisStoreService,
    private readonly configService: ConfigService,
    private readonly dispatchRealtimeService: DispatchRealtimeService,
    @Inject(forwardRef(() => DispatchQueueService))
    private readonly dispatchQueueService: DispatchQueueService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getDispatchSettings(): Promise<DispatchSettingsDto> {
    const defaults = this.getDefaultDispatchSettings();
    const stored = await this.redisStoreService.getJson<
      Partial<DispatchSettingsDto>
    >(DISPATCH_SETTINGS_KEY);

    return this.normalizeDispatchSettings({
      ...defaults,
      ...(stored ?? {}),
    });
  }

  async updateDispatchSettings(
    dto: UpdateDispatchSettingsDto,
  ): Promise<DispatchSettingsDto> {
    const current = await this.getDispatchSettings();
    const updated = this.normalizeDispatchSettings({
      ...current,
      ...dto,
    });
    await this.redisStoreService.setJson(DISPATCH_SETTINGS_KEY, updated);
    return updated;
  }

  async findAndAssign(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== OrderStatus.SEARCHING) {
      return;
    }

    const pendingOffer = await this.dispatchOffersRepository.findOne({
      where: { orderId: order.id, response: IsNull() },
    });
    if (pendingOffer) {
      return;
    }

    const settings = await this.getDispatchSettings();
    const rankedExecutorIds = await this.rankExecutorsForOrder(order, settings);
    if (rankedExecutorIds.length === 0) {
      this.logger.warn(`No dispatch candidates for order ${order.id}`);
      await this.dispatchQueueService.scheduleRetry(order.id, 30_000);
      return;
    }

    await this.redisStoreService.setJson(
      this.getQueueKey(order.id),
      {
        executorIds: rankedExecutorIds.slice(0, settings.maxCandidates),
        currentIndex: 0,
        attempts: 0,
      } satisfies DispatchQueueState,
      600,
    );

    await this.offerNextCandidate(order.id);
  }

  async retryDispatch(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order || order.status !== OrderStatus.SEARCHING) {
      return;
    }

    await this.findAndAssign(orderId);
  }

  async restartDispatch(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    if (order.status !== OrderStatus.SEARCHING) {
      throw new BadRequestException({
        code: "ORDER_DISPATCH_RESTART_INVALID_STATUS",
        message: "Only searching orders can be re-dispatched manually",
      });
    }

    const pendingOffers = await this.dispatchOffersRepository.find({
      where: {
        orderId,
        response: IsNull(),
      },
    });

    if (pendingOffers.length > 0) {
      const respondedAt = new Date();
      for (const offer of pendingOffers) {
        offer.response = "timeout";
        offer.respondedAt = respondedAt;
      }

      await this.dispatchOffersRepository.save(pendingOffers);
    }

    await this.redisStoreService.delete(this.getQueueKey(orderId));
    await this.findAndAssign(orderId);
  }

  async handleOfferTimeout(orderId: string, offerId: string): Promise<void> {
    const offer = await this.dispatchOffersRepository.findOne({
      where: { id: offerId, orderId },
    });
    if (!offer || offer.response) {
      return;
    }

    offer.response = "timeout";
    offer.respondedAt = new Date();
    await this.dispatchOffersRepository.save(offer);
    await this.offerNextCandidate(orderId);
  }

  async acceptOrder(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderEntity> {
    const executor = await this.executorsRepository.findOne({
      where: { userId: executorUserId },
    });
    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }

    const offer = await this.dispatchOffersRepository.findOne({
      where: {
        orderId,
        executorId: executor.id,
        response: IsNull(),
      },
      order: {
        offeredAt: "DESC",
      },
    });
    if (!offer) {
      throw new BadRequestException({
        code: "DISPATCH_OFFER_NOT_FOUND",
        message: "No pending offer found for executor",
      });
    }

    offer.response = "accepted";
    offer.respondedAt = new Date();
    await this.dispatchOffersRepository.save(offer);

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    order.executorId = executor.id;
    await this.ordersRepository.save(order);
    await this.redisStoreService.delete(this.getQueueKey(orderId));

    return this.ordersService.transition(
      orderId,
      OrderStatus.ACCEPTED,
      executor.userId,
      { source: "dispatch_accept" },
    );
  }

  async rejectOrder(executorUserId: string, orderId: string): Promise<void> {
    const executor = await this.executorsRepository.findOne({
      where: { userId: executorUserId },
    });
    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }

    const offer = await this.dispatchOffersRepository.findOne({
      where: {
        orderId,
        executorId: executor.id,
        response: IsNull(),
      },
      order: {
        offeredAt: "DESC",
      },
    });
    if (!offer) {
      throw new BadRequestException({
        code: "DISPATCH_OFFER_NOT_FOUND",
        message: "No pending offer found for executor",
      });
    }

    offer.response = "rejected";
    offer.respondedAt = new Date();
    await this.dispatchOffersRepository.save(offer);
    await this.offerNextCandidate(orderId);
  }

  async getIncomingOffers(
    executorUserId: string,
  ): Promise<IncomingDispatchOfferDto[]> {
    const executor = await this.executorsRepository.findOne({
      where: { userId: executorUserId },
    });
    if (!executor) {
      return [];
    }

    const offers = await this.dispatchOffersRepository.find({
      where: { executorId: executor.id, response: IsNull() },
      order: { offeredAt: "DESC" },
      take: 10,
    });
    if (offers.length === 0) {
      return [];
    }

    const orderIds = [...new Set(offers.map((offer) => offer.orderId))];
    const orders = await this.ordersRepository.find({
      where: { id: In(orderIds) },
    });
    const routePoints = await this.routePointsRepository.find({
      where: orderIds.map((orderId) => ({ orderId })),
      order: { sequenceIndex: "ASC" },
    });
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    const routePointsMap = new Map<string, RoutePointEntity[]>();

    for (const routePoint of routePoints) {
      const items = routePointsMap.get(routePoint.orderId) ?? [];
      items.push(routePoint);
      routePointsMap.set(routePoint.orderId, items);
    }

    const incomingOffers: IncomingDispatchOfferDto[] = [];

    for (const offer of offers) {
      const order = orderMap.get(offer.orderId);
      if (!order) {
        continue;
      }

      const points = routePointsMap.get(offer.orderId) ?? [];
      const pickupPoint = points[0];
      const destinationPoint = points.at(-1);

      incomingOffers.push({
        orderId: order.id,
        serviceType: order.serviceType,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        clientName: null,
        clientPhone: null,
        estimatedPrice: order.estimatedPrice,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
        pickupAddress: this.compactAddress(pickupPoint?.address) || null,
        pickupLat: pickupPoint?.lat ?? null,
        pickupLng: pickupPoint?.lng ?? null,
        destinationAddress:
          this.compactAddress(destinationPoint?.address) || null,
        destinationLat: destinationPoint?.lat ?? null,
        destinationLng: destinationPoint?.lng ?? null,
        offeredAt: offer.offeredAt,
      });
    }

    return incomingOffers;
  }

  private async offerNextCandidate(orderId: string): Promise<void> {
    const queueState = await this.redisStoreService.getJson<DispatchQueueState>(
      this.getQueueKey(orderId),
    );
    if (!queueState) {
      return;
    }

    if (
      queueState.currentIndex >= queueState.executorIds.length ||
      queueState.attempts >= 5
    ) {
      await this.dispatchQueueService.scheduleRetry(orderId, 30_000);
      return;
    }

    const executorId = queueState.executorIds[queueState.currentIndex];
    if (!executorId) {
      await this.dispatchQueueService.scheduleRetry(orderId, 30_000);
      return;
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order || order.status !== OrderStatus.SEARCHING) {
      return;
    }

    const routePoints = await this.routePointsRepository.find({
      where: { orderId },
      order: { sequenceIndex: "ASC" },
    });
    const executor = await this.executorsRepository.findOne({
      where: { id: executorId },
    });
    if (!executor) {
      await this.offerNextCandidate(orderId);
      return;
    }
    if (!this.hasEnoughBalanceForDispatch(executor)) {
      this.logger.warn(
        `Skipping executor ${executorId} for order ${orderId}: balance below ${MIN_EXECUTOR_DISPATCH_BALANCE}`,
      );
      queueState.currentIndex += 1;
      queueState.attempts += 1;
      await this.redisStoreService.setJson(
        this.getQueueKey(orderId),
        queueState,
        600,
      );
      await this.offerNextCandidate(orderId);
      return;
    }

    const pickupAddress = this.compactAddress(routePoints[0]?.address);
    const destinationAddress = this.compactAddress(routePoints.at(-1)?.address);
    const client = await this.usersRepository.findOne({
      where: { id: order.clientId },
    });

    const offer = await this.dispatchOffersRepository.save(
      this.dispatchOffersRepository.create({
        orderId,
        executorId,
        respondedAt: null,
        response: null,
      }),
    );
    this.logger.log(
      `Dispatch offer ${offer.id} order ${orderId} -> executor ${executorId}`,
    );

    queueState.currentIndex += 1;
    queueState.attempts += 1;
    await this.redisStoreService.setJson(
      this.getQueueKey(orderId),
      queueState,
      600,
    );

    const realtimePayload = {
      executorId,
      executorUserId: executor.userId,
      orderId,
      offer: {
        orderId,
        serviceType: order.serviceType,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        clientName: client?.name ?? null,
        clientPhone: client?.phone ?? null,
        estimatedPrice: order.estimatedPrice,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
        pickupAddress,
        pickupLat: routePoints[0]?.lat,
        pickupLng: routePoints[0]?.lng,
        destinationAddress,
        destinationLat: routePoints.at(-1)?.lat,
        destinationLng: routePoints.at(-1)?.lng,
      },
    };

    this.dispatchRealtimeService.emitIncomingOrder(realtimePayload);
    await this.notifyExecutorIncomingOrder(executorId, realtimePayload.offer);

    await this.dispatchQueueService.scheduleOfferTimeout(
      orderId,
      offer.id,
      20_000,
    );
  }

  private async notifyExecutorIncomingOrder(
    executorId: string,
    offer: {
      orderId: string;
      serviceType: ServiceType;
      currency: string;
      paymentMethod?: string;
      clientName?: string | null;
      clientPhone?: string | null;
      estimatedPrice: string | null;
      pickupAddress?: string;
      destinationAddress?: string;
    },
  ): Promise<void> {
    try {
      const executor = await this.executorsRepository.findOne({
        where: { id: executorId },
        relations: ["user"],
      });
      if (!executor?.userId) {
        return;
      }

      const lang = executor.user?.preferredLanguage === "kk" ? "kk" : "ru";
      await this.notificationsService.send(
        executor.userId,
        "executor_incoming_order",
        {
          orderId: offer.orderId,
          serviceType: offer.serviceType,
          pickupAddress: offer.pickupAddress ?? "",
          destinationAddress: offer.destinationAddress ?? "",
          price: offer.estimatedPrice ?? "",
          currency: offer.currency,
        },
        lang,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown incoming order notification error";
      this.logger.warn(
        `Failed to send incoming order notification to ${executorId}: ${message}`,
      );
    }
  }

  private async rankExecutorsForOrder(
    order: OrderEntity,
    settings: DispatchSettingsDto,
  ): Promise<string[]> {
    const routePoints = await this.routePointsRepository.find({
      where: { orderId: order.id },
      order: { sequenceIndex: "ASC" },
    });
    const pickupPoint = routePoints[0];
    if (!pickupPoint) {
      return [];
    }

    const radiusMeters = settings.maxRadiusKm * 1000;
    const locationRecords = await this.loadExecutorLocationRecords();
    const onlineRecords = locationRecords.filter(
      (record) => record.isOnline !== false,
    );
    if (onlineRecords.length === 0) {
      return [];
    }

    const deliveryDetails =
      order.serviceType === ServiceType.DELIVERY
        ? await this.deliveryDetailsRepository.findOne({
            where: { orderId: order.id },
          })
        : null;
    const requestedCarClass = order.serviceType === ServiceType.TAXI
      ? await this.resolveOrderCarClass(order.id)
      : null;

    const executorIds = [
      ...new Set(onlineRecords.map((record) => record.executorId)),
    ];
    const executors = await this.executorsRepository.find({
      where: { id: In(executorIds) },
    });
    const users = await this.usersRepository.find({
      where: { id: In(executors.map((executor) => executor.userId)) },
    });
    const userMap = new Map(users.map((user) => [user.id, user]));

    const scoredExecutors = onlineRecords
      .map((record) => {
        const executor = executors.find(
          (item) => item.id === record.executorId,
        );
        if (!executor) {
          return null;
        }

        const user = userMap.get(executor.userId);
        if (
          !this.matchesOrder(
            executor,
            user,
            order,
            deliveryDetails?.courierVehicleType ?? null,
            requestedCarClass,
          )
        ) {
          return null;
        }

        const distanceMeters = this.distanceMeters(
          { lat: pickupPoint.lat, lng: pickupPoint.lng },
          { lat: record.lat, lng: record.lng },
        );
        if (distanceMeters > radiusMeters) {
          return null;
        }

        const distanceScore = 1 - Math.min(distanceMeters / radiusMeters, 1);
        const ratingScore = Math.min(Number(executor.rating) / 5, 1);
        const activityScore = this.locationFreshnessScore(record.updatedAt);
        const priorityScore =
          1 - Math.min(Number(executor.cancelRate) / 100, 1);
        const totalScore =
          distanceScore * settings.distanceWeight +
          ratingScore * settings.ratingWeight +
          activityScore * settings.activityWeight +
          priorityScore * settings.priorityWeight;

        return {
          executorId: executor.id,
          totalScore,
        };
      })
      .filter(
        (item): item is { executorId: string; totalScore: number } =>
          item !== null,
      )
      .sort((left, right) => right.totalScore - left.totalScore);

    return scoredExecutors.map((item) => item.executorId);
  }

  private async loadExecutorLocationRecords(): Promise<
    ExecutorLocationRecord[]
  > {
    const recordsByExecutorId = new Map<string, ExecutorLocationRecord>();
    const fallbackMaxAgeMinutes = Number(
      this.configService.get<string>(
        "DISPATCH_LOCATION_FALLBACK_MAX_AGE_MINUTES",
      ) ?? "30",
    );
    const fallbackMaxAgeMs =
      (Number.isFinite(fallbackMaxAgeMinutes) && fallbackMaxAgeMinutes > 0
        ? fallbackMaxAgeMinutes
        : 30) *
      60 *
      1000;

    const persistedLocations = await this.executorLocationsRepository.find();
    for (const location of persistedLocations) {
      const updatedAt = location.updatedAt?.toISOString();
      const ageMs = updatedAt
        ? Date.now() - new Date(updatedAt).getTime()
        : Number.POSITIVE_INFINITY;
      if (!Number.isFinite(ageMs) || ageMs > fallbackMaxAgeMs) {
        continue;
      }

      recordsByExecutorId.set(location.executorId, {
        executorId: location.executorId,
        lat: location.lat,
        lng: location.lng,
        heading: location.heading,
        isOnline: true,
        updatedAt,
      });
    }

    const redisLocations =
      await this.redisStoreService.listJsonByPattern<ExecutorLocationRecord>(
        "executor:location:*",
      );
    for (const location of redisLocations) {
      recordsByExecutorId.set(location.executorId, location);
    }

    return [...recordsByExecutorId.values()];
  }

  private getDefaultDispatchSettings(): DispatchSettingsDto {
    const envRadius = Number(
      this.configService.get<string>("DISPATCH_MAX_RADIUS_KM") ?? "3",
    );

    return this.normalizeDispatchSettings({
      maxRadiusKm: Number.isFinite(envRadius) && envRadius > 0 ? envRadius : 3,
      distanceWeight: 0.6,
      ratingWeight: 0.2,
      activityWeight: 0.15,
      priorityWeight: 0.05,
      maxCandidates: 5,
    });
  }

  private normalizeDispatchSettings(
    settings: Partial<DispatchSettingsDto>,
  ): DispatchSettingsDto {
    const maxRadiusKm = this.clampNumber(settings.maxRadiusKm, 0.5, 30, 3);
    const maxCandidates = Math.round(
      this.clampNumber(settings.maxCandidates, 1, 20, 5),
    );
    const weights = {
      distanceWeight: this.clampNumber(settings.distanceWeight, 0, 1, 0.6),
      ratingWeight: this.clampNumber(settings.ratingWeight, 0, 1, 0.2),
      activityWeight: this.clampNumber(settings.activityWeight, 0, 1, 0.15),
      priorityWeight: this.clampNumber(settings.priorityWeight, 0, 1, 0.05),
    };
    const totalWeight =
      weights.distanceWeight +
      weights.ratingWeight +
      weights.activityWeight +
      weights.priorityWeight;
    const divisor = totalWeight > 0 ? totalWeight : 1;

    return {
      maxRadiusKm,
      distanceWeight: weights.distanceWeight / divisor,
      ratingWeight: weights.ratingWeight / divisor,
      activityWeight: weights.activityWeight / divisor,
      priorityWeight: weights.priorityWeight / divisor,
      maxCandidates,
    };
  }

  private clampNumber(
    value: number | undefined,
    min: number,
    max: number,
    fallback: number,
  ): number {
    if (value === undefined || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(Math.max(value, min), max);
  }

  private locationFreshnessScore(updatedAt: string | undefined): number {
    if (!updatedAt) {
      return 0.5;
    }

    const ageMs = Date.now() - new Date(updatedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs <= 0) {
      return 1;
    }

    return 1 - Math.min(ageMs / 300_000, 1);
  }

  private matchesOrder(
    executor: ExecutorEntity,
    user: UserEntity | undefined,
    order: OrderEntity,
    vehicleType: CourierVehicleType | null,
    requestedCarClass: string | null,
  ): boolean {
    if (!executor.isOnline) {
      return false;
    }

    if (executor.verificationStatus !== "verified") {
      return false;
    }

    if (user?.isBlocked) {
      return false;
    }

    if (!this.hasEnoughBalanceForDispatch(executor)) {
      return false;
    }

    if (this.isDriverRideService(order.serviceType)) {
      if (executor.executorType !== ExecutorType.DRIVER) {
        return false;
      }

      if (order.serviceType === ServiceType.INTERCITY) {
        return true;
      }

      const enabledTariffs = executor.enabledTariffs?.length
        ? executor.enabledTariffs
        : ["economy", "comfort", "comfort_plus", "business"];
      return enabledTariffs.includes(requestedCarClass ?? "economy");
    }

    if (executor.executorType !== ExecutorType.COURIER) {
      return false;
    }

    if (vehicleType && executor.vehicleType !== vehicleType) {
      return false;
    }

    return true;
  }

  private hasEnoughBalanceForDispatch(executor: ExecutorEntity): boolean {
    const balance = Number(executor.balance);
    return Number.isFinite(balance) && balance >= MIN_EXECUTOR_DISPATCH_BALANCE;
  }

  private isDriverRideService(serviceType: ServiceType): boolean {
    return (
      serviceType === ServiceType.TAXI || serviceType === ServiceType.INTERCITY
    );
  }

  private async resolveOrderCarClass(orderId: string): Promise<string> {
    const createEvent = await this.orderStatusEventsRepository.findOne({
      where: { orderId, toStatus: OrderStatus.DRAFT },
      order: { createdAt: "ASC" },
    });
    const carClass = createEvent?.metadata?.carClass;
    return typeof carClass === "string" && carClass.trim()
      ? carClass.trim()
      : "economy";
  }

  private getQueueKey(orderId: string): string {
    return `dispatch:queue:${orderId}`;
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
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
  }

  private compactAddress(value: string | null | undefined): string {
    const seen = new Set<string>();
    return (value ?? "")
      .split(",")
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter((part) => part.length > 0)
      .filter((part) => {
        const normalized = part.toLowerCase();
        if (this.isAdministrativeAddressPart(normalized)) {
          return false;
        }
        if (seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      })
      .slice(0, 4)
      .join(", ");
  }

  private isAdministrativeAddressPart(value: string): boolean {
    return (
      value === "казахстан" ||
      value === "қазақстан" ||
      value === "kazakhstan" ||
      value.includes("область") ||
      value.includes("облысы") ||
      value.includes("район") ||
      value.includes("аудан") ||
      value.includes("region")
    );
  }

  private degToRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}

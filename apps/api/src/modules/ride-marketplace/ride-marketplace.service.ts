import { isUUID } from "class-validator";
import { createHash } from "node:crypto";
import {
  Currency,
  ExecutorType,
  OrderStatus,
  ServiceType,
} from "@dos/shared-types";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { CityEntity } from "../admin/entities/city.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { ExecutorLocationEntity } from "../executors/entities/executor-location.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { OrdersService } from "../orders/orders.service";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrderStatusEventEntity } from "../orders/entities/order-status-event.entity";
import { RoutePointEntity } from "../orders/entities/route-point.entity";
import { UserEntity } from "../users/entities/user.entity";
import { RidePriceOfferEntity } from "./entities/ride-price-offer.entity";
import {
  AcceptRideOfferDto,
  CreateRideRequestDto,
  RideFeedQueryDto,
  RideQuoteDto,
  SubmitRideOfferDto,
} from "./dto/ride-request.dto";
import { minorUnits, money, totalAmount } from "./ride-money";
function canonicalPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalPayload);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalPayload(item)]),
    );
  return value;
}
const activeStatuses = [
  OrderStatus.DRAFT,
  OrderStatus.SEARCHING,
  OrderStatus.ACCEPTED,
  OrderStatus.ARRIVING,
  OrderStatus.WAITING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.DELIVERED,
];
const driverBusyStatuses = activeStatuses.filter(
  (status) => status !== OrderStatus.DRAFT && status !== OrderStatus.SEARCHING,
);
@Injectable()
export class RideMarketplaceService implements OnModuleInit, OnModuleDestroy {
  private notificationTimer?: NodeJS.Timeout;
  private flushing = false;
  private readonly logger = new Logger(RideMarketplaceService.name);
  constructor(
    private readonly db: DataSource,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}
  async cities() {
    return this.db.getRepository(CityEntity).find({
      where: { isActive: true },
      select: { id: true, nameRu: true, nameKk: true, currency: true },
      order: { nameRu: "ASC" },
    });
  }
  async quote(dto: RideQuoteDto) {
    const city = await this.orders.resolveBookingCity(
      dto.cityId,
      dto.routePoints,
      dto.serviceType,
    );
    if (!city.isActive)
      throw new BadRequestException({
        code: "CITY_NOT_ACTIVE",
        message: "CITY_NOT_ACTIVE",
      });
    if (![Currency.KZT, Currency.RUB].includes(city.currency))
      throw new BadRequestException({
        code: "RIDE_CURRENCY_UNSUPPORTED",
        message: "RIDE_CURRENCY_UNSUPPORTED",
      });
    const basis = city.ridePricingBasis;
    const count = basis === "seat" ? (dto.passengerCount ?? 1) : 1;
    const rate = Number(city.rideExchangeRate);
    const factor = city.currency === Currency.KZT ? 1 : rate;
    const minimumBaseMinor = Math.ceil(
      (Number(city.rideMinimumOrderKzt) * 100) / factor - 1e-8,
    );
    const rounding = city.currency === Currency.KZT ? 100 : 1;
    const minimumUnitMinor = Math.ceil(minimumBaseMinor / rounding) * rounding;
    const minimumTotalMinor = minimumUnitMinor * count;
    const stepMinor = Math.max(
      rounding,
      Math.round((Number(city.ridePriceStepKzt) * 100) / factor / rounding) *
        rounding,
    );
    const termsKey = createHash("sha256")
      .update(
        JSON.stringify([
          city.id,
          city.currency,
          basis,
          count,
          minimumTotalMinor,
          minimumUnitMinor,
          stepMinor,
        ]),
      )
      .digest("hex");
    return {
      termsKey,
      cityId: city.id,
      cityName: city.nameRu,
      currency: city.currency,
      pricingBasis: basis,
      passengerCount: count,
      minimumOrderPrice: money(minimumTotalMinor),
      minimumUnitPrice: money(minimumUnitMinor),
      priceStep: money(stepMinor),
      exchangeRate: rate,
      commissionPercent: city.rideCommissionPercent,
      commissionFixed: city.rideCommissionFixed,
    };
  }
  async create(
    clientId: string,
    dto: CreateRideRequestDto,
    requestKey: string,
  ) {
    if (!isUUID(requestKey))
      throw new BadRequestException({
        code: "IDEMPOTENCY_KEY_REQUIRED",
        message: "IDEMPOTENCY_KEY_REQUIRED",
      });
    const hash = createHash("sha256")
      .update(JSON.stringify(canonicalPayload(dto)))
      .digest("hex");
    let created = false;
    const order = await this.db.transaction(async (manager) => {
      const users = manager.getRepository(UserEntity);
      const user = await users.findOne({
        where: { id: clientId },
        lock: { mode: "pessimistic_write" },
      });
      if (!user || user.isBlocked)
        throw new ForbiddenException({
          code: "USER_BLOCKED",
          message: "USER_BLOCKED",
        });
      const repository = manager.getRepository(OrderEntity);
      const existing = await repository.findOneBy({
        clientId,
        rideRequestKey: requestKey,
      });
      if (existing) {
        if (existing.ridePayloadHash !== hash)
          throw new ConflictException({
            code: "IDEMPOTENCY_KEY_REUSED",
            message: "IDEMPOTENCY_KEY_REUSED",
          });
        return existing;
      }
      const quote = await this.quote(dto);
      if (dto.termsKey !== quote.termsKey)
        throw new ConflictException({
          code: "RIDE_PRICING_CHANGED",
          message: "RIDE_PRICING_CHANGED",
        });
      if (
        await repository.exists({
          where: { clientId, status: In(activeStatuses) },
        })
      )
        throw new ConflictException({
          code: "ORDER_ALREADY_ACTIVE",
          message: "ORDER_ALREADY_ACTIVE",
        });
      const unit = money(
        minorUnits(quote.minimumUnitPrice) +
          minorUnits(quote.priceStep) * dto.priceSteps,
      );
      const newOrder = await repository.save(
        repository.create({
          clientId,
          cityId: quote.cityId,
          currency: quote.currency,
          serviceType: dto.serviceType,
          status: OrderStatus.DRAFT,
          paymentMethod: dto.paymentMethod,
          estimatedPrice: totalAmount(unit, quote.passengerCount),
          discountAmount: "0.00",
          carClass: null,
          isNegotiated: true,
          rideRequestKey: requestKey,
          ridePayloadHash: hash,
          passengerCount: quote.passengerCount,
          ridePricingBasis: quote.pricingBasis,
          rideUnitPrice: unit,
          rideMinimumUnitPrice: quote.minimumUnitPrice,
          ridePriceStep: quote.priceStep,
          rideCommissionPercent: quote.commissionPercent,
          rideCommissionFixed: quote.commissionFixed,
          pickupEntrance: dto.pickupEntrance?.trim() || null,
          pickupComment: dto.pickupComment?.trim() || null,
          needsChildSeat: dto.needsChildSeat ?? false,
          sharedRide: dto.sharedRide ?? false,
        }),
      );
      await manager.getRepository(RoutePointEntity).save(
        dto.routePoints.map((point, index) => ({
          orderId: newOrder.id,
          sequenceIndex: index,
          lat: point.lat,
          lng: point.lng,
          address: point.address,
          notes: index === 0 ? dto.pickupComment?.trim() || null : null,
        })),
      );
      await manager.getRepository(OrderStatusEventEntity).save({
        orderId: newOrder.id,
        fromStatus: null,
        toStatus: OrderStatus.DRAFT,
        actorId: clientId,
        metadata: {
          source: "ride_request",
          requestKey,
          pricingBasis: quote.pricingBasis,
        },
      });
      const searching = await this.orders.transition(
        newOrder.id,
        OrderStatus.SEARCHING,
        clientId,
        { source: "passenger_ride_request" },
        manager,
      );
      created = true;
      return searching;
    });
    if (created) await this.announce(order, OrderStatus.SEARCHING);
    return this.orders.getOrder(clientId, order.id);
  }
  private async driver(manager: EntityManager, userId: string, lock = false) {
    const driver = await manager.getRepository(ExecutorEntity).findOne({
      where: { userId },
      ...(lock ? { lock: { mode: "pessimistic_write" as const } } : {}),
    });
    const user = await manager
      .getRepository(UserEntity)
      .findOneBy({ id: userId });
    if (
      !driver ||
      driver.executorType !== ExecutorType.DRIVER ||
      !user ||
      user.isBlocked
    )
      throw new ForbiddenException({
        code: "RIDE_DRIVER_NOT_ELIGIBLE",
        message: "RIDE_DRIVER_NOT_ELIGIBLE",
      });
    if (driver.verificationStatus !== "verified") {
      throw new ForbiddenException({
        code: "EXECUTOR_NOT_VERIFIED",
        message: "EXECUTOR_NOT_VERIFIED",
      });
    }
    if (!driver.isOnline) {
      throw new ForbiddenException({
        code: "RIDE_DRIVER_OFFLINE",
        message: "RIDE_DRIVER_OFFLINE",
      });
    }
    if (!driver.cityId && lock) {
      // Legacy approved profiles did not require a city. Use only fresh presence,
      // never a default map center or an arbitrary first city.
      const position = await manager
        .getRepository(ExecutorLocationEntity)
        .findOneBy({ executorId: driver.id });
      let city: CityEntity | null = null;
      if (
        position &&
        Date.now() - position.updatedAt.getTime() < 300000 &&
        Date.now() >= position.updatedAt.getTime()
      ) {
        try {
          city = await this.orders.resolveBookingCity(
            undefined,
            [{ lat: position.lat, lng: position.lng }],
            ServiceType.INTERCITY,
          );
        } catch {
          /* Explicit city selection remains available when GPS cannot resolve it. */
        }
      }
      if (!city?.isActive)
        throw new ForbiddenException({
          code: "RIDE_DRIVER_CITY_REQUIRED",
          message: "RIDE_DRIVER_CITY_REQUIRED",
        });
      driver.cityId = city.id;
      await manager.getRepository(ExecutorEntity).save(driver);
    }
    if (!driver.cityId)
      throw new ForbiddenException({
        code: "RIDE_DRIVER_CITY_REQUIRED",
        message: "RIDE_DRIVER_CITY_REQUIRED",
      });
    const city = await manager
      .getRepository(CityEntity)
      .findOneByOrFail({ id: driver.cityId });
    if (!city.isActive)
      throw new BadRequestException({
        code: "CITY_NOT_ACTIVE",
        message: "City not active",
      });
    if (Number(driver.balance) < Number(city.rideMinimumDriverBalance))
      throw new ForbiddenException({
        code: "EXECUTOR_BALANCE_TOO_LOW",
        message: "EXECUTOR_BALANCE_TOO_LOW",
      });
    return driver;
  }
  async feed(userId: string, query: RideFeedQueryDto) {
    const driver = await this.db.transaction((manager) =>
      this.driver(manager, userId, true),
    );
    const repository = this.db.getRepository(OrderEntity);
    if (
      await repository.exists({
        where: { executorId: driver.id, status: In(driverBusyStatuses) },
      })
    )
      return { items: [], nextOffset: null };
    const distance = `6371000 * acos(least(1.0,greatest(-1.0,sin(radians(:lat))*sin(radians(pickup.lat)) + cos(radians(:lat))*cos(radians(pickup.lat))*cos(radians(pickup.lng-:lng)))))`;
    const builder = repository
      .createQueryBuilder("o")
      .innerJoin(
        RoutePointEntity,
        "pickup",
        "pickup.order_id=o.id AND pickup.sequence_index=0",
      )
      .where(
        "o.is_negotiated=true AND o.status=:status AND o.executor_id IS NULL AND o.city_id=:cityId",
        { status: OrderStatus.SEARCHING, cityId: driver.cityId },
      )
      .andWhere("o.passenger_count <= :capacity", {
        capacity: driver.passengerCapacity,
      })
      .addSelect(distance, "pickup_distance")
      .setParameters({ lat: query.lat, lng: query.lng })
      .orderBy("pickup_distance", "ASC")
      .addOrderBy("o.created_at", "ASC")
      .addOrderBy("o.id", "ASC")
      .offset(query.offset ?? 0)
      .limit((query.limit ?? 30) + 1);
    const { entities, raw } = await builder.getRawAndEntities();
    const limit = query.limit ?? 30;
    const page = entities.slice(0, limit);
    const ids = page.map((order) => order.id);
    const [points, offers] = ids.length
      ? await Promise.all([
          this.db.getRepository(RoutePointEntity).find({
            where: { orderId: In(ids) },
            order: { sequenceIndex: "ASC" },
          }),
          this.db
            .getRepository(RidePriceOfferEntity)
            .find({ where: { orderId: In(ids), executorId: driver.id } }),
        ])
      : [[], []];
    const items = await Promise.all(
      page.map(async (order, index) => ({
        ...(await this.view(
          order,
          points.filter((point) => point.orderId === order.id),
        )),
        pickupDistanceMeters: Number(raw[index].pickup_distance),
        myOffer: offers.find((offer) => offer.orderId === order.id) ?? null,
      })),
    );
    return {
      items,
      nextOffset: entities.length > limit ? (query.offset ?? 0) + limit : null,
    };
  }
  async submit(userId: string, orderId: string, dto: SubmitRideOfferDto) {
    const offered = await this.db.transaction(async (manager) => {
      const order = await manager.getRepository(OrderEntity).findOne({
        where: { id: orderId },
        lock: { mode: "pessimistic_write" },
      });
      if (
        !order?.isNegotiated ||
        order.status !== OrderStatus.SEARCHING ||
        order.executorId
      )
        throw new ConflictException({
          code: "RIDE_REQUEST_NOT_OPEN",
          message: "RIDE_REQUEST_NOT_OPEN",
        });
      const driver = await this.driver(manager, userId, true);
      if (
        driver.cityId !== order.cityId ||
        driver.passengerCapacity < order.passengerCount
      )
        throw new ForbiddenException({
          code: "RIDE_DRIVER_NOT_ELIGIBLE",
          message: "RIDE_DRIVER_NOT_ELIGIBLE",
        });
      if (
        await manager.getRepository(OrderEntity).exists({
          where: { executorId: driver.id, status: In(driverBusyStatuses) },
        })
      )
        throw new ConflictException({
          code: "EXECUTOR_ALREADY_BUSY",
          message: "EXECUTOR_ALREADY_BUSY",
        });
      if (order.needsChildSeat && !dto.hasChildSeat)
        throw new BadRequestException({
          code: "RIDE_CHILD_SEAT_REQUIRED",
          message: "RIDE_CHILD_SEAT_REQUIRED",
        });
      const price =
        minorUnits(order.rideUnitPrice!) +
        minorUnits(order.ridePriceStep!) * dto.priceSteps;
      if (price < minorUnits(order.rideMinimumUnitPrice!))
        throw new BadRequestException({
          code: "RIDE_PRICE_BELOW_MINIMUM",
          message: "RIDE_PRICE_BELOW_MINIMUM",
        });
      const offers = manager.getRepository(RidePriceOfferEntity);
      const existing = await offers.findOneBy({
        orderId,
        executorId: driver.id,
      });
      const city = await manager
        .getRepository(CityEntity)
        .findOneByOrFail({ id: order.cityId });
      if (
        existing?.status === "pending" &&
        existing.expiresAt > new Date() &&
        existing.priceSteps === dto.priceSteps &&
        existing.hasChildSeat === Boolean(dto.hasChildSeat)
      )
        return { offer: existing, order, driver, changed: false };
      const offer = await offers.save(
        offers.create({
          ...existing,
          orderId,
          executorId: driver.id,
          priceSteps: dto.priceSteps,
          unitPrice: money(price),
          totalPrice: money(price * order.passengerCount),
          hasChildSeat: Boolean(dto.hasChildSeat),
          status: "pending",
          version: (existing?.version ?? 0) + 1,
          expiresAt: new Date(Date.now() + city.rideOfferTtlSeconds * 1000),
        }),
      );
      return { offer, order, driver, changed: true };
    });
    if (offered.changed) await this.flushNotifications();
    return offered.offer;
  }
  async withdraw(userId: string, orderId: string) {
    const driver = await this.db
      .getRepository(ExecutorEntity)
      .findOneBy({ userId });
    if (!driver)
      throw new ForbiddenException({
        code: "RIDE_DRIVER_NOT_ELIGIBLE",
        message: "RIDE_DRIVER_NOT_ELIGIBLE",
      });
    await this.db.transaction(async (manager) => {
      await manager.getRepository(OrderEntity).findOne({
        where: { id: orderId },
        lock: { mode: "pessimistic_write" },
      });
      const offer = await manager
        .getRepository(RidePriceOfferEntity)
        .findOneBy({ orderId, executorId: driver.id });
      if (offer?.status === "accepted")
        throw new ConflictException({
          code: "RIDE_OFFER_UNAVAILABLE",
          message: "RIDE_OFFER_UNAVAILABLE",
        });
      if (offer?.status === "pending")
        await manager
          .getRepository(RidePriceOfferEntity)
          .update(offer.id, { status: "withdrawn" });
    });
    return { withdrawn: true };
  }
  async listOffers(clientId: string, orderId: string) {
    const order = await this.db
      .getRepository(OrderEntity)
      .findOneBy({ id: orderId, clientId });
    if (!order?.isNegotiated)
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "ORDER_NOT_FOUND",
      });
    const offers = await this.db.getRepository(RidePriceOfferEntity).find({
      where: { orderId, status: In(["pending", "accepted"]) },
      order: { totalPrice: "ASC", createdAt: "ASC" },
    });
    const items = [];
    for (const offer of offers) {
      if (
        offer.status === "pending" &&
        (offer.expiresAt <= new Date() ||
          order.status !== OrderStatus.SEARCHING)
      )
        continue;
      const executor = await this.db
        .getRepository(ExecutorEntity)
        .findOneByOrFail({ id: offer.executorId });
      if (
        offer.status === "pending" &&
        (!executor.isOnline || executor.verificationStatus !== "verified")
      )
        continue;
      const user = await this.db
        .getRepository(UserEntity)
        .findOneByOrFail({ id: executor.userId });
      if (user.isBlocked) continue;
      if (offer.status === "pending") {
        try {
          await this.driver(this.db.manager, executor.userId);
        } catch {
          continue;
        }
        if (
          executor.cityId !== order.cityId ||
          executor.passengerCapacity < order.passengerCount ||
          (await this.db.getRepository(OrderEntity).exists({
            where: {
              executorId: executor.id,
              status: In(driverBusyStatuses),
            },
          }))
        )
          continue;
      }
      items.push({
        ...offer,
        driverName: user.name,
        driverRating: executor.rating,
        vehicleMake: executor.vehicleMake,
        vehicleModel: executor.vehicleModel,
        vehicleColor: executor.vehicleColor,
        vehiclePlate: executor.vehiclePlate,
      });
    }
    return { order: await this.orders.getOrder(clientId, orderId), items };
  }
  async accept(
    clientId: string,
    orderId: string,
    offerId: string,
    dto: AcceptRideOfferDto,
  ) {
    let changed = false;
    const order = await this.db.transaction(async (manager) => {
      const repository = manager.getRepository(OrderEntity);
      const order = await repository.findOne({
        where: { id: orderId, clientId },
        lock: { mode: "pessimistic_write" },
      });
      if (!order?.isNegotiated)
        throw new NotFoundException({
          code: "ORDER_NOT_FOUND",
          message: "ORDER_NOT_FOUND",
        });
      const offers = manager.getRepository(RidePriceOfferEntity);
      const offer = await offers.findOneBy({ id: offerId, orderId });
      if (!offer || offer.version !== dto.version)
        throw new ConflictException({
          code: "RIDE_OFFER_CHANGED",
          message: "RIDE_OFFER_CHANGED",
        });
      if (order.executorId === offer.executorId && offer.status === "accepted")
        return order;
      if (
        order.status !== OrderStatus.SEARCHING ||
        order.executorId ||
        offer.status !== "pending" ||
        offer.expiresAt <= new Date()
      )
        throw new ConflictException({
          code: "RIDE_OFFER_UNAVAILABLE",
          message: "RIDE_OFFER_UNAVAILABLE",
        });
      const profile = await manager
        .getRepository(ExecutorEntity)
        .findOneByOrFail({ id: offer.executorId });
      const driver = await this.driver(manager, profile.userId, true);
      if (
        driver.cityId !== order.cityId ||
        driver.passengerCapacity < order.passengerCount ||
        (order.needsChildSeat && !offer.hasChildSeat)
      )
        throw new ConflictException({
          code: "RIDE_OFFER_UNAVAILABLE",
          message: "RIDE_OFFER_UNAVAILABLE",
        });
      if (
        await repository.exists({
          where: { executorId: driver.id, status: In(driverBusyStatuses) },
        })
      )
        throw new ConflictException({
          code: "EXECUTOR_ALREADY_BUSY",
          message: "EXECUTOR_ALREADY_BUSY",
        });
      order.executorId = driver.id;
      order.rideUnitPrice = offer.unitPrice;
      order.estimatedPrice = offer.totalPrice;
      await repository.save(order);
      await offers.update(offer.id, { status: "accepted" });
      await offers
        .createQueryBuilder()
        .update()
        .set({ status: "superseded" })
        .where("order_id=:orderId AND id<>:offerId AND status=:status", {
          orderId,
          offerId,
          status: "pending",
        })
        .execute();
      const accepted = await this.orders.transition(
        orderId,
        OrderStatus.ACCEPTED,
        clientId,
        {
          source: "passenger_selected_offer",
          offerId,
          offerVersion: offer.version,
        },
        manager,
      );
      changed = true;
      return accepted;
    });
    if (changed) await this.announce(order, OrderStatus.ACCEPTED);
    return this.orders.getOrder(clientId, order.id);
  }
  private async view(order: OrderEntity, route?: RoutePointEntity[]) {
    const points =
      route ??
      (await this.db.getRepository(RoutePointEntity).find({
        where: { orderId: order.id },
        order: { sequenceIndex: "ASC" },
      }));
    return {
      id: order.id,
      serviceType: order.serviceType,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      totalPrice: order.estimatedPrice,
      unitPrice: order.rideUnitPrice,
      minimumUnitPrice: order.rideMinimumUnitPrice,
      priceStep: order.ridePriceStep,
      pricingBasis: order.ridePricingBasis,
      passengerCount: order.passengerCount,
      pickupEntrance: order.pickupEntrance,
      pickupComment: order.pickupComment,
      needsChildSeat: order.needsChildSeat,
      sharedRide: order.sharedRide,
      routePoints: points.map(({ lat, lng, address }) => ({
        lat,
        lng,
        address,
      })),
    };
  }
  onModuleInit(): void {
    this.notificationTimer = setInterval(() => {
      void this.flushNotifications();
    }, 10000);
    this.notificationTimer.unref();
  }
  onModuleDestroy(): void {
    if (this.notificationTimer) clearInterval(this.notificationTimer);
  }
  async flushNotifications(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      await this.db.transaction(async (manager) => {
        const offers = manager.getRepository(RidePriceOfferEntity);
        const pending = await offers
          .createQueryBuilder("offer")
          .where(
            "offer.status='pending' AND offer.expires_at>now() AND offer.notification_sent_version<offer.version AND EXISTS (SELECT 1 FROM orders notification_order WHERE notification_order.id=offer.order_id AND notification_order.status='searching' AND notification_order.executor_id IS NULL)",
          )
          .orderBy("offer.updated_at", "ASC")
          .take(50)
          .setLock("pessimistic_write")
          .setOnLocked("skip_locked")
          .getMany();
        for (const offer of pending) {
          const order = await manager
            .getRepository(OrderEntity)
            .findOneByOrFail({ id: offer.orderId });
          if (order.status !== OrderStatus.SEARCHING) continue;
          const client = await manager
            .getRepository(UserEntity)
            .findOneByOrFail({ id: order.clientId });
          const driver = await manager
            .getRepository(ExecutorEntity)
            .findOneByOrFail({ id: offer.executorId });
          const driverUser = await manager
            .getRepository(UserEntity)
            .findOneByOrFail({ id: driver.userId });
          await this.notifications.send(
            client.id,
            "ride_price_offer",
            {
              orderId: order.id,
              offerId: offer.id,
              version: offer.version,
              driverName: driverUser.name ?? "",
              totalPrice: offer.totalPrice,
              currency: order.currency,
            },
            client.preferredLanguage === "kk" ? "kk" : "ru",
          );
          await offers.update(offer.id, {
            notificationSentVersion: offer.version,
          });
        }
      });
    } catch {
      this.logger.warn(
        "Ride offer notifications remain in the outbox for retry",
      );
    } finally {
      this.flushing = false;
    }
  }

  private async announce(order: OrderEntity, status: OrderStatus) {
    try {
      await this.orders.announceTransition(order, status);
    } catch {
      this.logger.warn(
        `Ride ${order.id} committed; status notification retry is required`,
      );
    }
  }
}

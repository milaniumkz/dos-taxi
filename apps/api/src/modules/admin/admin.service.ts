import {
  Currency,
  OrderStatus,
  PaymentStatus,
  ServiceType,
} from "@dos/shared-types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DataSource, In, IsNull, Repository } from "typeorm";
import { createHash } from "node:crypto";

import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { DispatchService } from "../dispatch/dispatch.service";
import { DriverBonusSettingEntity } from "../executors/entities/driver-bonus-setting.entity";
import {
  ExecutorBalanceTopUpEntity,
  ExecutorBalanceTopUpStatus,
} from "../executors/entities/executor-balance-top-up.entity";
import {
  ExecutorPayoutEntity,
  ExecutorPayoutStatus,
} from "../executors/entities/executor-payout.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { OrderStatusEventEntity } from "../orders/entities/order-status-event.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { RoutePointEntity } from "../orders/entities/route-point.entity";
import { OrdersService } from "../orders/orders.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PaymentResponseDto } from "../payments/dto/payment-response.dto";
import { PaymentEntity } from "../payments/entities/payment.entity";
import { PaymentsService } from "../payments/payments.service";
import { PromoCodeEntity } from "../promo-codes/entities/promo-code.entity";
import { UserEntity } from "../users/entities/user.entity";

import {
  AdminActivityAction,
  AdminActivityDto,
  AdminActivityEntityType,
} from "./dto/admin-activity.dto";
import {
  AdminNoteDto,
  CreateAdminNoteDto,
  type AdminNoteKind,
  type AdminNoteState,
  type AdminNoteEntityType,
  UpdateAdminNoteDto,
} from "./dto/admin-note.dto";
import {
  AdminOrderDetailDto,
  AdminOrderPartyDto,
  AdminOrderExecutorPartyDto,
} from "./dto/admin-order-detail.dto";
import { AdminOrderSummaryDto } from "./dto/admin-order-summary.dto";
import { AdminOrdersQueryDto } from "./dto/admin-orders-query.dto";
import { AdminOrdersResponseDto } from "./dto/admin-orders-response.dto";
import { AssignOrderDto } from "./dto/assign-order.dto";
import { CancelPaymentDto } from "./dto/cancel-payment.dto";
import { CreateCityDto } from "./dto/create-city.dto";
import { CreateTariffDto } from "./dto/create-tariff.dto";
import { CreatePromoCodeDto } from "./dto/create-promo-code.dto";
import { FinancialReportDto } from "./dto/financial-report.dto";
import { ListAdminActivityQueryDto } from "./dto/list-admin-activity-query.dto";
import { ListAdminNotesQueryDto } from "./dto/list-admin-notes-query.dto";
import { ListExecutorsQueryDto } from "./dto/list-executors-query.dto";
import { ListTariffsQueryDto } from "./dto/list-tariffs-query.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { OperationsReportDto } from "./dto/operations-report.dto";
import { PromoCodeAnalyticsQueryDto } from "./dto/promo-code-analytics-query.dto";
import {
  PromoCodeAnalyticsCityBreakdownDto,
  PromoCodeAnalyticsDto,
  PromoCodeAnalyticsPaymentMethodBreakdownDto,
  PromoCodeAnalyticsStatusBreakdownDto,
} from "./dto/promo-code-analytics.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";
import { ReportQueryDto } from "./dto/report-query.dto";
import { UpdateAdminExecutorDto } from "./dto/update-admin-executor.dto";
import { UpdateAdminOrderStatusDto } from "./dto/update-admin-order-status.dto";
import { UpdateAdminUserDto } from "./dto/update-admin-user.dto";
import { UpdateBalanceTopUpDto } from "./dto/update-balance-top-up.dto";
import {
  CreateExecutorPayoutDto,
  UpdateExecutorPayoutDto,
} from "./dto/executor-payout.dto";
import {
  DriverBonusSettingsDto,
  UpdateDriverBonusSettingsDto,
} from "./dto/driver-bonus-settings.dto";
import { UpdateCityDto } from "./dto/update-city.dto";
import { UpdatePromoCodeDto } from "./dto/update-promo-code.dto";
import { UpdateTariffDto } from "./dto/update-tariff.dto";
import { VerifyExecutorDto } from "./dto/verify-executor.dto";
import { AdminActivityLogEntity } from "./entities/admin-activity-log.entity";
import { AdminNoteEntity } from "./entities/admin-note.entity";
import { CityEntity } from "./entities/city.entity";
import { TariffEntity } from "./entities/tariff.entity";
import {
  DispatchSettingsDto,
  UpdateDispatchSettingsDto,
} from "../dispatch/dto/dispatch-settings.dto";

import { buildDefaultTariffs, isAllowedTariffKey } from "./tariff-defaults";

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly citiesRepository: Repository<CityEntity>,
    @InjectRepository(TariffEntity)
    private readonly tariffsRepository: Repository<TariffEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(RoutePointEntity)
    private readonly routePointsRepository: Repository<RoutePointEntity>,
    @InjectRepository(OrderStatusEventEntity)
    private readonly orderStatusEventsRepository: Repository<OrderStatusEventEntity>,
    @InjectRepository(DeliveryDetailEntity)
    private readonly deliveryDetailsRepository: Repository<DeliveryDetailEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(ExecutorEntity)
    private readonly executorsRepository: Repository<ExecutorEntity>,
    @InjectRepository(ExecutorBalanceTopUpEntity)
    private readonly balanceTopUpsRepository: Repository<ExecutorBalanceTopUpEntity>,
    @InjectRepository(ExecutorPayoutEntity)
    private readonly payoutsRepository: Repository<ExecutorPayoutEntity>,
    @InjectRepository(PromoCodeEntity)
    private readonly promoCodesRepository: Repository<PromoCodeEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(AdminActivityLogEntity)
    private readonly adminActivityLogsRepository: Repository<AdminActivityLogEntity>,
    @InjectRepository(AdminNoteEntity)
    private readonly adminNotesRepository: Repository<AdminNoteEntity>,
    @InjectRepository(DriverBonusSettingEntity)
    private readonly driverBonusSettingsRepository: Repository<DriverBonusSettingEntity>,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly dispatchService: DispatchService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  getDispatchSettings(): Promise<DispatchSettingsDto> {
    return this.dispatchService.getDispatchSettings();
  }

  updateDispatchSettings(
    dto: UpdateDispatchSettingsDto,
  ): Promise<DispatchSettingsDto> {
    return this.dispatchService.updateDispatchSettings(dto);
  }

  async getDriverBonusSettings(): Promise<DriverBonusSettingsDto> {
    const settings = await this.getOrCreateDriverBonusSettings();
    return this.serializeDriverBonusSettings(settings);
  }

  async updateDriverBonusSettings(
    dto: UpdateDriverBonusSettingsDto,
  ): Promise<DriverBonusSettingsDto> {
    const settings = await this.getOrCreateDriverBonusSettings();
    if (dto.isEnabled !== undefined) {
      settings.isEnabled = dto.isEnabled;
    }
    if (dto.ordersRequired !== undefined) {
      settings.ordersRequired = dto.ordersRequired;
    }
    if (dto.bonusAmount !== undefined) {
      settings.bonusAmount = dto.bonusAmount.toFixed(2);
    }
    const saved = await this.driverBonusSettingsRepository.save(settings);
    return this.serializeDriverBonusSettings(saved);
  }

  listCities(): Promise<CityEntity[]> {
    return this.citiesRepository.find({
      order: {
        isActive: "DESC",
        createdAt: "DESC",
      },
    });
  }

  getCityDetail(cityId: string): Promise<CityEntity> {
    return this.getCity(cityId);
  }

  async createCity(actorId: string, dto: CreateCityDto): Promise<CityEntity> {
    const city = await this.citiesRepository.save(
      this.citiesRepository.create({
        nameRu: dto.nameRu,
        nameKk: dto.nameKk,
        countryCode: dto.countryCode.toUpperCase(),
        currency: dto.currency,
        timezone: dto.timezone,
        isActive: dto.isActive ?? false,
        serviceZone: dto.serviceZone ?? null,
      }),
    );

    await this.ensureDefaultTariffsForCity(actorId, city);

    await this.recordActivity(actorId, "city.created", "city", city.id, {
      countryCode: city.countryCode,
      currency: city.currency,
      isActive: city.isActive,
    });

    return city;
  }

  async updateCity(
    cityId: string,
    dto: UpdateCityDto,
    actorId: string,
  ): Promise<CityEntity> {
    const city = await this.getCity(cityId);

    const updated = this.citiesRepository.merge(city, {
      ...dto,
      countryCode: dto.countryCode?.toUpperCase() ?? city.countryCode,
      serviceZone:
        dto.serviceZone === undefined ? city.serviceZone : dto.serviceZone,
    });

    const saved = await this.citiesRepository.save(updated);

    if (saved.isActive) {
      await this.ensureDefaultTariffsForCity(actorId, saved);
    }

    await this.recordActivity(actorId, "city.updated", "city", saved.id, {
      nameRu: dto.nameRu,
      nameKk: dto.nameKk,
      countryCode: dto.countryCode?.toUpperCase(),
      currency: dto.currency,
      timezone: dto.timezone,
      isActive: dto.isActive,
    });

    return saved;
  }

  private async ensureDefaultTariffsForCity(
    actorId: string,
    city: CityEntity,
  ): Promise<void> {
    const validFrom = new Date();
    const existingTariffs = await this.tariffsRepository.find({
      where: { cityId: city.id, isActive: true },
    });
    const existingKeys = new Set(
      existingTariffs.map(
        (tariff) => `${tariff.serviceType}:${tariff.vehicleClass ?? "default"}`,
      ),
    );
    const defaults = buildDefaultTariffs().filter(
      (tariff) =>
        !existingKeys.has(
          `${tariff.serviceType}:${tariff.vehicleClass ?? "default"}`,
        ),
    );

    if (defaults.length === 0) {
      return;
    }

    await this.tariffsRepository.save(
      defaults.map((tariff) =>
        this.tariffsRepository.create({
          cityId: city.id,
          serviceType: tariff.serviceType,
          vehicleClass: tariff.vehicleClass,
          nameRu: tariff.nameRu,
          nameKk: tariff.nameKk,
          basePrice: tariff.basePrice.toFixed(2),
          pricePerKm: tariff.pricePerKm.toFixed(4),
          pricePerMinute: tariff.pricePerMinute.toFixed(4),
          minimumPrice: tariff.minimumPrice.toFixed(2),
          freeWaitingSeconds: 180,
          paidWaitingPerMinute: tariff.paidWaitingPerMinute.toFixed(4),
          commissionPercent: "10.00",
          commissionFixed: "0.00",
          currency: city.currency ?? Currency.KZT,
          validFrom,
          validTo: null,
          isActive: true,
          createdById: actorId,
        }),
      ),
    );
  }

  listTariffs(query: ListTariffsQueryDto): Promise<TariffEntity[]> {
    const where: Record<string, unknown> = {};
    if (query.cityId) {
      where.cityId = query.cityId;
    }
    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }
    if (query.vehicleClass !== undefined) {
      where.vehicleClass = query.vehicleClass;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.tariffsRepository.find({
      where,
      order: {
        validFrom: "DESC",
        createdAt: "DESC",
      },
    });
  }

  async createTariff(
    actorId: string,
    dto: CreateTariffDto,
    key?: string,
  ): Promise<TariffEntity> {
    if (!dto.nameRu.trim() || !dto.nameKk.trim())
      throw new BadRequestException("TARIFF_NAME_REQUIRED");
    const city = await this.citiesRepository.findOneBy({ id: dto.cityId });
    if (!city || !city.isActive)
      throw new BadRequestException("CITY_NOT_ACTIVE");
    if (city.currency !== dto.currency)
      throw new BadRequestException("TARIFF_CITY_CURRENCY_MISMATCH");
    const vehicleClass =
      dto.serviceType === ServiceType.TAXI
        ? dto.vehicleClass || "economy"
        : null;
    this.assertAllowedTariffKey(dto.serviceType, vehicleClass);
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (validTo && validTo <= validFrom)
      throw new BadRequestException("TARIFF_DATE_RANGE_INVALID");
    if ((dto.commissionPercent ?? 10) > 100)
      throw new BadRequestException("TARIFF_COMMISSION_INVALID");
    return this.dataSource.transaction(async (manager) => {
      if (key)
        await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          `tariff-request:${actorId}:${key}`,
        ]);
      await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `tariff:${city.id}:${dto.serviceType}:${vehicleClass}`,
      ]);
      const repository = manager.getRepository(TariffEntity);
      const requestKey = key ? `${actorId}:${key}` : null;
      const payloadHash = createHash("sha256")
        .update(JSON.stringify(dto))
        .digest("hex");
      if (requestKey) {
        const previous = await manager
          .getRepository(AdminActivityLogEntity)
          .createQueryBuilder("activity")
          .where("activity.metadata ->> 'requestKey' = :requestKey", {
            requestKey,
          })
          .andWhere("activity.action = :action", { action: "tariff.created" })
          .getOne();
        if (previous) {
          if (previous.metadata?.payloadHash !== payloadHash)
            throw new BadRequestException("IDEMPOTENCY_KEY_CONFLICT");
          return repository.findOneByOrFail({ id: previous.entityId });
        }
      }
      if (dto.isActive !== false) {
        const current = await repository.find({
          where: {
            cityId: city.id,
            serviceType: dto.serviceType,
            vehicleClass: vehicleClass === null ? IsNull() : vehicleClass,
            isActive: true,
          },
        });
        for (const tariff of current) {
          if (tariff.validFrom >= validFrom)
            throw new BadRequestException("TARIFF_VERSION_CONFLICT");
          if (!tariff.validTo || tariff.validTo > validFrom) {
            tariff.validTo = validFrom;
            if (validFrom <= new Date()) tariff.isActive = false;
            await repository.save(tariff);
          }
        }
      }
      const tariff = await repository.save(
        repository.create({
          cityId: city.id,
          serviceType: dto.serviceType,
          vehicleClass,
          nameRu: dto.nameRu.trim(),
          nameKk: dto.nameKk.trim(),
          currency: city.currency,
          basePrice: dto.basePrice.toFixed(2),
          pricePerKm: dto.pricePerKm.toFixed(4),
          pricePerMinute: dto.pricePerMinute.toFixed(4),
          minimumPrice: dto.minimumPrice.toFixed(2),
          freeWaitingSeconds: dto.freeWaitingSeconds ?? 180,
          paidWaitingPerMinute: (dto.paidWaitingPerMinute ?? 0).toFixed(4),
          commissionPercent: (dto.commissionPercent ?? 10).toFixed(2),
          commissionFixed: (dto.commissionFixed ?? 0).toFixed(2),
          validFrom,
          validTo,
          isActive: dto.isActive !== false,
          createdById: actorId,
        }),
      );
      await manager.getRepository(AdminActivityLogEntity).save({
        actorId,
        action: "tariff.created",
        entityType: "tariff",
        entityId: tariff.id,
        metadata: { cityId: city.id, requestKey, payloadHash },
      });
      return tariff;
    });
  }

  getTariffDetail(tariffId: string): Promise<TariffEntity> {
    return this.getTariff(tariffId);
  }

  async updateTariff(
    tariffId: string,
    actorId: string,
    dto: UpdateTariffDto,
  ): Promise<TariffEntity> {
    const current = await this.getTariff(tariffId);
    this.assertAllowedTariffKey(current.serviceType, current.vehicleClass);

    const lockedFields: (keyof UpdateTariffDto)[] = [
      "cityId",
      "serviceType",
      "vehicleClass",
      "nameRu",
      "nameKk",
      "validFrom",
      "validTo",
    ];
    const hasLockedFieldChange = lockedFields.some((field) => {
      if (dto[field] === undefined) {
        return false;
      }
      return true;
    });
    if (hasLockedFieldChange) {
      throw new BadRequestException({
        code: "TARIFF_STRUCTURE_LOCKED",
        message:
          "Tariff city, service type, class, name and dates are managed through tariff creation",
      });
    }

    if (dto.basePrice !== undefined) {
      current.basePrice = dto.basePrice.toFixed(2);
    }
    if (dto.pricePerKm !== undefined) {
      current.pricePerKm = dto.pricePerKm.toFixed(4);
    }
    if (dto.pricePerMinute !== undefined) {
      current.pricePerMinute = dto.pricePerMinute.toFixed(4);
    }
    if (dto.minimumPrice !== undefined) {
      current.minimumPrice = dto.minimumPrice.toFixed(2);
    }
    if (dto.freeWaitingSeconds !== undefined) {
      current.freeWaitingSeconds = dto.freeWaitingSeconds;
    }
    if (dto.paidWaitingPerMinute !== undefined) {
      current.paidWaitingPerMinute = dto.paidWaitingPerMinute.toFixed(4);
    }
    if (dto.commissionPercent !== undefined) {
      current.commissionPercent = dto.commissionPercent.toFixed(2);
    }
    if (dto.commissionFixed !== undefined) {
      current.commissionFixed = dto.commissionFixed.toFixed(2);
    }
    if (dto.currency !== undefined) {
      current.currency = dto.currency;
    }
    if (dto.isActive !== undefined) current.isActive = dto.isActive;

    const savedTariff = await this.tariffsRepository.save(current);
    await this.recordActivity(actorId, "tariff.updated", "tariff", tariffId, {
      cityId: savedTariff.cityId,
      serviceType: savedTariff.serviceType,
      vehicleClass: savedTariff.vehicleClass,
      currency: savedTariff.currency,
      isActive: savedTariff.isActive,
    });

    return savedTariff;
  }

  private assertAllowedTariffKey(
    serviceType: ServiceType,
    vehicleClass: string | null,
  ): void {
    if (isAllowedTariffKey(serviceType, vehicleClass)) {
      return;
    }

    throw new BadRequestException({
      code: "TARIFF_CLASS_NOT_ALLOWED",
      message:
        "Allowed tariffs: taxi economy/comfort/comfort_plus/business/together/child, one delivery tariff, one intercity tariff",
    });
  }
  async listOrders(
    query: AdminOrdersQueryDto,
  ): Promise<AdminOrdersResponseDto> {
    const normalizedLimit = Math.min(query.limit ?? 20, 50);
    const qb = this.ordersRepository
      .createQueryBuilder("order")
      .orderBy("order.createdAt", "DESC")
      .addOrderBy("order.id", "DESC")
      .take(normalizedLimit + 1);

    if (query.status) {
      qb.andWhere("order.status = :status", { status: query.status });
    }
    if (query.serviceType) {
      qb.andWhere("order.service_type = :serviceType", {
        serviceType: query.serviceType,
      });
    }
    if (query.paymentMethod) {
      qb.andWhere("order.payment_method = :paymentMethod", {
        paymentMethod: query.paymentMethod,
      });
    }
    if (query.promoCodeId) {
      qb.andWhere("order.promo_code_id = :promoCodeId", {
        promoCodeId: query.promoCodeId,
      });
    }
    if (query.cityId) {
      qb.andWhere("order.city_id = :cityId", { cityId: query.cityId });
    }
    if (query.dateFrom) {
      qb.andWhere("order.created_at >= :dateFrom", {
        dateFrom: new Date(query.dateFrom),
      });
    }
    if (query.dateTo) {
      qb.andWhere("order.created_at <= :dateTo", {
        dateTo: new Date(query.dateTo),
      });
    }
    if (query.cursor) {
      const cursor = this.decodeCursor(query.cursor);
      if (cursor) {
        qb.andWhere(
          "(order.created_at < :cursorCreatedAt OR (order.created_at = :cursorCreatedAt AND order.id < :cursorId))",
          {
            cursorCreatedAt: cursor.createdAt,
            cursorId: cursor.id,
          },
        );
      }
    }

    const orders = await qb.getMany();
    const pageItems = orders.slice(0, normalizedLimit);
    const orderIds = pageItems.map((order) => order.id);

    const routePoints = orderIds.length
      ? await this.routePointsRepository.find({
          where: orderIds.map((orderId) => ({ orderId })),
          order: { sequenceIndex: "ASC" },
        })
      : [];
    const deliveryDetails = orderIds.length
      ? await this.deliveryDetailsRepository.find({
          where: orderIds.map((orderId) => ({ orderId })),
        })
      : [];
    const promoCodeIds = [
      ...new Set(
        pageItems
          .map((order) => order.promoCodeId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const promoCodes = promoCodeIds.length
      ? await this.promoCodesRepository.find({
          where: {
            id: In(promoCodeIds),
          },
        })
      : [];

    const routePointsByOrderId = new Map<string, RoutePointEntity[]>();
    for (const routePoint of routePoints) {
      const items = routePointsByOrderId.get(routePoint.orderId) ?? [];
      items.push(routePoint);
      routePointsByOrderId.set(routePoint.orderId, items);
    }

    const deliveryByOrderId = new Map(
      deliveryDetails.map((detail) => [detail.orderId, detail]),
    );
    const promoCodesById = new Map(
      promoCodes.map((promoCode) => [promoCode.id, promoCode]),
    );

    return {
      items: pageItems.map((order) =>
        this.toAdminOrderSummary(
          order,
          routePointsByOrderId.get(order.id) ?? [],
          deliveryByOrderId.get(order.id) ?? null,
          order.promoCodeId
            ? (promoCodesById.get(order.promoCodeId)?.code ?? null)
            : null,
        ),
      ),
      nextCursor:
        orders.length > normalizedLimit && pageItems.at(-1)
          ? this.encodeCursor(pageItems.at(-1)!)
          : null,
    };
  }

  async getOrderDetail(orderId: string): Promise<AdminOrderDetailDto> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ["client", "executor", "executor.user", "city", "promoCode"],
    });

    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }

    const [routePoints, deliveryDetail, payments, statusEvents] =
      await Promise.all([
        this.routePointsRepository.find({
          where: { orderId },
          order: { sequenceIndex: "ASC" },
        }),
        this.deliveryDetailsRepository.findOne({
          where: { orderId },
        }),
        this.paymentsRepository.find({
          where: { orderId },
          order: {
            createdAt: "DESC",
          },
        }),
        this.orderStatusEventsRepository.find({
          where: { orderId },
          order: {
            createdAt: "ASC",
          },
        }),
      ]);

    return this.toAdminOrderDetail(
      order,
      routePoints,
      deliveryDetail,
      payments,
      statusEvents,
    );
  }

  async assignOrder(
    orderId: string,
    dto: AssignOrderDto,
    actorId: string,
  ): Promise<AdminOrderSummaryDto> {
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
        code: "ORDER_ASSIGN_INVALID_STATUS",
        message: "Only searching orders can be assigned manually",
      });
    }

    const executor = await this.executorsRepository.findOne({
      where: { id: dto.executorId },
      relations: ["user"],
    });
    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }
    if (
      executor.verificationStatus !== "verified" ||
      executor.user?.isBlocked
    ) {
      throw new BadRequestException({
        code: "EXECUTOR_ASSIGNMENT_INVALID",
        message: "Executor must be verified and not blocked",
      });
    }

    order.executorId = executor.id;
    await this.ordersRepository.save(order);
    const updated = await this.ordersService.transition(
      order.id,
      OrderStatus.ACCEPTED,
      actorId,
      {
        source: "admin_assign",
        executorId: executor.id,
      },
    );

    await this.recordActivity(actorId, "order.assigned", "order", updated.id, {
      executorId: executor.id,
      source: "admin_assign",
    });

    return this.buildAdminOrderSummary(updated);
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateAdminOrderStatusDto,
    actorId: string,
  ): Promise<AdminOrderSummaryDto> {
    if (
      dto.status !== OrderStatus.CANCELLED_SYSTEM &&
      dto.status !== OrderStatus.FAILED
    ) {
      throw new BadRequestException({
        code: "ORDER_ADMIN_STATUS_UNSUPPORTED",
        message: "Admin can only set cancelled_system or failed statuses",
      });
    }

    const updated = await this.ordersService.transition(
      orderId,
      dto.status,
      actorId,
      {
        source: "admin_status_override",
        reason: dto.reason?.trim() || null,
      },
    );

    await this.recordActivity(
      actorId,
      "order.status_updated",
      "order",
      updated.id,
      {
        status: dto.status,
        reason: dto.reason?.trim() || null,
      },
    );

    return this.buildAdminOrderSummary(updated);
  }

  async restartOrderDispatch(
    orderId: string,
    actorId: string,
  ): Promise<AdminOrderSummaryDto> {
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

    await this.dispatchService.restartDispatch(orderId);
    await this.recordActivity(
      actorId,
      "order.dispatch_retried",
      "order",
      order.id,
      {
        status: order.status,
      },
    );
    return this.buildAdminOrderSummary(order);
  }

  async listNotes(query: ListAdminNotesQueryDto): Promise<AdminNoteDto[]> {
    if (query.entityType && query.entityId) {
      await this.ensureNoteTargetExists(query.entityType, query.entityId);
    }

    const normalizedLimit = Math.min(query.limit ?? 100, 200);
    const qb = this.adminNotesRepository
      .createQueryBuilder("note")
      .leftJoinAndSelect("note.createdBy", "author")
      .leftJoinAndSelect("note.assignedTo", "assignee")
      .orderBy("note.isPinned", "DESC")
      .addOrderBy(
        `CASE
          WHEN note.state = 'open' THEN 0
          WHEN note.state = 'resolved' THEN 1
          ELSE 2
        END`,
        "ASC",
      )
      .addOrderBy("note.createdAt", "DESC")
      .limit(normalizedLimit);

    if (query.entityType) {
      qb.andWhere("note.entity_type = :entityType", {
        entityType: query.entityType,
      });
    }

    if (query.entityId) {
      qb.andWhere("note.entity_id = :entityId", {
        entityId: query.entityId,
      });
    }

    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      qb.andWhere(
        `(
          LOWER(note.body) LIKE :search
          OR note.id::text LIKE :search
          OR note.entity_id::text LIKE :search
        )`,
        {
          search: `%${normalizedQuery}%`,
        },
      );
    }

    if (query.authorQuery) {
      const normalizedAuthorQuery = query.authorQuery.trim().toLowerCase();
      const authorPhoneQuery = query.authorQuery.trim().replace(/\s+/g, "");
      qb.andWhere(
        `(
          LOWER(COALESCE(author.name, '')) LIKE :authorSearch
          OR author.phone LIKE :authorPhoneSearch
        )`,
        {
          authorSearch: `%${normalizedAuthorQuery}%`,
          authorPhoneSearch: `%${authorPhoneQuery}%`,
        },
      );
    }

    if (query.assignedToId) {
      qb.andWhere("note.assigned_to_id = :assignedToId", {
        assignedToId: query.assignedToId,
      });
    }

    if (typeof query.hasAssignee === "boolean") {
      qb.andWhere(
        query.hasAssignee
          ? "note.assigned_to_id IS NOT NULL"
          : "note.assigned_to_id IS NULL",
      );
    }

    if (query.assigneeQuery) {
      const normalizedAssigneeQuery = query.assigneeQuery.trim().toLowerCase();
      const assigneePhoneQuery = query.assigneeQuery.trim().replace(/\s+/g, "");
      qb.andWhere(
        `(
          LOWER(COALESCE(assignee.name, '')) LIKE :assigneeSearch
          OR assignee.phone LIKE :assigneePhoneSearch
        )`,
        {
          assigneeSearch: `%${normalizedAssigneeQuery}%`,
          assigneePhoneSearch: `%${assigneePhoneQuery}%`,
        },
      );
    }

    if (query.kind) {
      qb.andWhere("note.kind = :kind", {
        kind: query.kind,
      });
    }

    if (query.state) {
      qb.andWhere("note.state = :state", {
        state: query.state,
      });
    }

    if (typeof query.isPinned === "boolean") {
      qb.andWhere("note.is_pinned = :isPinned", {
        isPinned: query.isPinned,
      });
    }

    const notes = await qb.getMany();

    return this.toAdminNotes(notes);
  }

  async listActivity(
    query: ListAdminActivityQueryDto,
  ): Promise<AdminActivityDto[]> {
    const normalizedLimit = Math.min(query.limit ?? 100, 200);
    const qb = this.adminActivityLogsRepository
      .createQueryBuilder("activity")
      .leftJoinAndSelect("activity.actor", "actor")
      .orderBy("activity.createdAt", "DESC")
      .limit(normalizedLimit);

    if (query.entityType) {
      qb.andWhere("activity.entity_type = :entityType", {
        entityType: query.entityType,
      });
    }

    if (query.entityId) {
      qb.andWhere("activity.entity_id = :entityId", {
        entityId: query.entityId,
      });
    }

    if (query.action) {
      qb.andWhere("activity.action = :action", {
        action: query.action,
      });
    }

    if (query.group) {
      switch (query.group) {
        case "order":
          qb.andWhere("activity.action LIKE :orderAction", {
            orderAction: "order.%",
          });
          break;
        case "payment":
          qb.andWhere("activity.action LIKE :paymentAction", {
            paymentAction: "payment.%",
          });
          break;
        case "note":
          qb.andWhere("activity.action LIKE :noteAction", {
            noteAction: "note.%",
          });
          break;
        case "moderation":
          qb.andWhere(
            `(
              activity.action LIKE :userAction
              OR activity.action LIKE :executorAction
              OR activity.action LIKE :cityAction
              OR activity.action LIKE :tariffAction
              OR activity.action LIKE :promoCodeAction
            )`,
            {
              userAction: "user.%",
              executorAction: "executor.%",
              cityAction: "city.%",
              tariffAction: "tariff.%",
              promoCodeAction: "promo_code.%",
            },
          );
          break;
      }
    }

    if (query.window) {
      const now = Date.now();
      const threshold = new Date(
        now -
          (query.window === "hour"
            ? 60 * 60 * 1000
            : query.window === "day"
              ? 24 * 60 * 60 * 1000
              : 7 * 24 * 60 * 60 * 1000),
      );
      qb.andWhere("activity.created_at >= :threshold", {
        threshold,
      });
    }

    if (query.actorId) {
      qb.andWhere("activity.actor_id = :actorId", {
        actorId: query.actorId,
      });
    }

    if (query.actorQuery) {
      const normalizedActorQuery = query.actorQuery.trim().toLowerCase();
      const actorPhoneQuery = query.actorQuery.trim().replace(/\s+/g, "");
      qb.andWhere(
        `(
          LOWER(COALESCE(actor.name, '')) LIKE :actorSearch
          OR actor.phone LIKE :actorPhoneSearch
        )`,
        {
          actorSearch: `%${normalizedActorQuery}%`,
          actorPhoneSearch: `%${actorPhoneQuery}%`,
        },
      );
    }

    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      qb.andWhere(
        `(
          LOWER(activity.action) LIKE :search
          OR activity.entity_id::text LIKE :search
          OR LOWER(COALESCE(activity.metadata::text, '')) LIKE :search
        )`,
        {
          search: `%${normalizedQuery}%`,
        },
      );
    }

    const activity = await qb.getMany();
    return this.toAdminActivity(activity);
  }

  async createNote(
    actorId: string,
    dto: CreateAdminNoteDto,
  ): Promise<AdminNoteDto> {
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException({
        code: "ADMIN_NOTE_BODY_EMPTY",
        message: "Admin note body must not be empty",
      });
    }

    const [actor, , assignee] = await Promise.all([
      this.findUser(actorId),
      this.ensureNoteTargetExists(dto.entityType, dto.entityId),
      dto.assignedToId
        ? this.findUser(dto.assignedToId)
        : Promise.resolve(null),
    ]);

    const note = await this.adminNotesRepository.save(
      this.adminNotesRepository.create({
        entityType: dto.entityType,
        entityId: dto.entityId,
        body,
        kind: dto.kind ?? "context",
        isPinned: dto.isPinned ?? false,
        state: "open",
        createdById: actor.id,
        assignedToId: assignee?.id ?? null,
      }),
    );

    await this.recordActivity(
      actorId,
      "note.created",
      dto.entityType,
      dto.entityId,
      {
        noteId: note.id,
        kind: note.kind,
        isPinned: note.isPinned,
        state: note.state,
        assignedToId: note.assignedToId,
      },
    );

    return this.getAdminNoteDto(note.id);
  }

  async updateNote(
    noteId: string,
    actorId: string,
    dto: UpdateAdminNoteDto,
  ): Promise<AdminNoteDto> {
    await this.findUser(actorId);

    if (
      dto.kind === undefined &&
      dto.state === undefined &&
      dto.isPinned === undefined &&
      dto.assignedToId === undefined
    ) {
      throw new BadRequestException({
        code: "ADMIN_NOTE_UPDATE_EMPTY",
        message: "At least one note field must be updated",
      });
    }

    const note = await this.findAdminNote(noteId);
    const assignee =
      dto.assignedToId && dto.assignedToId !== note.assignedToId
        ? await this.findUser(dto.assignedToId)
        : null;

    if (dto.kind !== undefined) {
      note.kind = dto.kind;
    }

    if (dto.isPinned !== undefined) {
      note.isPinned = dto.isPinned;
    }

    if (dto.assignedToId !== undefined) {
      note.assignedToId = assignee?.id ?? dto.assignedToId ?? null;
    }

    if (dto.state !== undefined && dto.state !== note.state) {
      this.applyAdminNoteState(note, dto.state);
    }

    await this.adminNotesRepository.save(note);

    await this.recordActivity(
      actorId,
      "note.updated",
      note.entityType as AdminActivityEntityType,
      note.entityId,
      {
        noteId: note.id,
        kind: note.kind,
        isPinned: note.isPinned,
        state: note.state,
        assignedToId: note.assignedToId,
      },
    );

    return this.getAdminNoteDto(note.id);
  }

  async listUsers(query: ListUsersQueryDto): Promise<UserEntity[]> {
    const normalizedLimit = Math.min(query.limit ?? 100, 100);
    const qb = this.usersRepository
      .createQueryBuilder("user")
      .orderBy("user.isBlocked", "DESC")
      .addOrderBy("user.createdAt", "DESC")
      .take(normalizedLimit);

    if (query.preferredLanguage) {
      qb.andWhere("user.preferred_language = :preferredLanguage", {
        preferredLanguage: query.preferredLanguage,
      });
    }

    if (query.isBlocked !== undefined) {
      qb.andWhere("user.is_blocked = :isBlocked", {
        isBlocked: query.isBlocked,
      });
    }

    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      const phoneQuery = query.query.trim().replace(/\s+/g, "");
      qb.andWhere(
        `(
          LOWER(COALESCE(user.name, '')) LIKE :search
          OR user.phone LIKE :phoneSearch
        )`,
        {
          search: `%${normalizedQuery}%`,
          phoneSearch: `%${phoneQuery}%`,
        },
      );
    }

    return qb.getMany();
  }

  getUser(userId: string): Promise<UserEntity> {
    return this.findUser(userId);
  }

  async updateUser(
    userId: string,
    dto: UpdateAdminUserDto,
    actorId: string,
  ): Promise<UserEntity> {
    const user = await this.findUser(userId);
    const updated = this.usersRepository.merge(user, dto);
    const saved = await this.usersRepository.save(updated);
    await this.recordActivity(actorId, "user.updated", "user", saved.id, {
      name: dto.name,
      isBlocked: dto.isBlocked,
    });
    return saved;
  }

  async listExecutors(query: ListExecutorsQueryDto): Promise<ExecutorEntity[]> {
    const normalizedLimit = Math.min(query.limit ?? 100, 100);
    const qb = this.executorsRepository
      .createQueryBuilder("executor")
      .leftJoinAndSelect("executor.user", "user")
      .leftJoinAndSelect("executor.city", "city")
      .orderBy("executor.isOnline", "DESC")
      .addOrderBy("executor.createdAt", "DESC")
      .take(normalizedLimit);

    if (query.cityId) {
      qb.andWhere("executor.city_id = :cityId", {
        cityId: query.cityId,
      });
    }

    if (query.executorType) {
      qb.andWhere("executor.executor_type = :executorType", {
        executorType: query.executorType,
      });
    }

    if (query.vehicleType) {
      qb.andWhere("executor.vehicle_type = :vehicleType", {
        vehicleType: query.vehicleType,
      });
    }

    if (query.verificationStatus) {
      qb.andWhere("executor.verification_status = :verificationStatus", {
        verificationStatus: query.verificationStatus,
      });
    }

    if (query.isOnline !== undefined) {
      qb.andWhere("executor.is_online = :isOnline", {
        isOnline: query.isOnline,
      });
    }

    if (query.isBlocked !== undefined) {
      qb.andWhere("user.is_blocked = :isBlocked", {
        isBlocked: query.isBlocked,
      });
    }

    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      const phoneQuery = query.query.trim().replace(/\s+/g, "");
      qb.andWhere(
        `(
          LOWER(COALESCE(user.name, '')) LIKE :search
          OR user.phone LIKE :phoneSearch
          OR executor.id::text LIKE :phoneSearch
        )`,
        {
          search: `%${normalizedQuery}%`,
          phoneSearch: `%${phoneQuery}%`,
        },
      );
    }

    return qb.getMany();
  }

  async getExecutor(executorId: string): Promise<ExecutorEntity> {
    const executor = await this.executorsRepository.findOne({
      where: { id: executorId },
      relations: ["user", "city"],
    });
    if (!executor) {
      throw new NotFoundException({
        code: "EXECUTOR_NOT_FOUND",
        message: "Executor not found",
      });
    }

    return executor;
  }

  async updateExecutor(
    executorId: string,
    dto: UpdateAdminExecutorDto,
    actorId: string,
    action: AdminActivityAction = "executor.updated",
  ): Promise<ExecutorEntity> {
    const executor = await this.getExecutor(executorId);

    if (dto.cityId) {
      await this.getCity(dto.cityId);
    }

    if (dto.isBlocked !== undefined && executor.user) {
      executor.user.isBlocked = dto.isBlocked;
      await this.usersRepository.save(executor.user);
    }

    const updated = this.executorsRepository.merge(executor, {
      executorType: dto.executorType ?? executor.executorType,
      vehicleType:
        dto.vehicleType !== undefined ? dto.vehicleType : executor.vehicleType,
      carClass: dto.carClass !== undefined ? dto.carClass : executor.carClass,
      vehicleMake:
        dto.vehicleMake !== undefined ? dto.vehicleMake : executor.vehicleMake,
      vehicleModel:
        dto.vehicleModel !== undefined
          ? dto.vehicleModel
          : executor.vehicleModel,
      vehicleYear:
        dto.vehicleYear !== undefined ? dto.vehicleYear : executor.vehicleYear,
      vehicleColor:
        dto.vehicleColor !== undefined
          ? dto.vehicleColor
          : executor.vehicleColor,
      vehiclePlate:
        dto.vehiclePlate !== undefined
          ? dto.vehiclePlate
          : executor.vehiclePlate,
      cityId: dto.cityId !== undefined ? dto.cityId : executor.cityId,
      verificationStatus: dto.verificationStatus ?? executor.verificationStatus,
      isOnline: dto.isOnline ?? executor.isOnline,
    });

    await this.executorsRepository.save(updated);
    const saved = await this.getExecutor(executorId);
    await this.recordActivity(actorId, action, "executor", saved.id, {
      executorType: dto.executorType,
      vehicleType: dto.vehicleType,
      carClass: dto.carClass,
      vehicleMake: dto.vehicleMake,
      vehicleModel: dto.vehicleModel,
      vehicleYear: dto.vehicleYear,
      vehicleColor: dto.vehicleColor,
      vehiclePlate: dto.vehiclePlate,
      cityId: dto.cityId,
      verificationStatus: dto.verificationStatus,
      isOnline: dto.isOnline,
      isBlocked: dto.isBlocked,
    });
    return saved;
  }

  verifyExecutor(
    executorId: string,
    actorId: string,
    dto: VerifyExecutorDto | string = "verified",
  ): Promise<ExecutorEntity> {
    const payload =
      typeof dto === "string"
        ? ({ verificationStatus: dto } satisfies UpdateAdminExecutorDto)
        : ({
            verificationStatus: dto.verificationStatus ?? "verified",
            carClass: dto.carClass,
          } satisfies UpdateAdminExecutorDto);

    return this.updateExecutor(
      executorId,
      payload,
      actorId,
      "executor.verified",
    );
  }

  blockExecutor(
    executorId: string,
    actorId: string,
    isBlocked = true,
  ): Promise<ExecutorEntity> {
    return this.updateExecutor(
      executorId,
      { isBlocked },
      actorId,
      "executor.blocked",
    );
  }

  listExecutorBalanceTopUps(
    status?: ExecutorBalanceTopUpStatus,
  ): Promise<ExecutorBalanceTopUpEntity[]> {
    return this.balanceTopUpsRepository.find({
      where: status ? { status } : {},
      relations: ["executor", "executor.user"],
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async updateExecutorBalanceTopUp(
    topUpId: string,
    dto: UpdateBalanceTopUpDto,
    actorId: string,
  ): Promise<ExecutorBalanceTopUpEntity> {
    const topUp = await this.balanceTopUpsRepository.findOne({
      where: { id: topUpId },
      relations: ["executor", "executor.user"],
    });
    if (!topUp) {
      throw new NotFoundException({
        code: "BALANCE_TOP_UP_NOT_FOUND",
        message: "Balance top-up request not found",
      });
    }

    const nextAmount = dto.amount ?? Number(topUp.amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      throw new BadRequestException({
        code: "BALANCE_TOP_UP_AMOUNT_INVALID",
        message: "Balance top-up amount is invalid",
      });
    }

    const previousStatus = topUp.status;
    const resolvedActorId = await this.resolveAdminActorId(actorId);
    const saved = await this.dataSource.transaction(async (manager) => {
      const lockedTopUp = await manager.findOne(ExecutorBalanceTopUpEntity, {
        where: { id: topUpId },
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedTopUp) {
        throw new NotFoundException({
          code: "BALANCE_TOP_UP_NOT_FOUND",
          message: "Balance top-up request not found",
        });
      }

      if (dto.status === "confirmed" && lockedTopUp.status !== "confirmed") {
        const executor = await manager.findOne(ExecutorEntity, {
          where: { id: lockedTopUp.executorId },
          lock: { mode: "pessimistic_write" },
        });
        if (!executor) {
          throw new NotFoundException({
            code: "EXECUTOR_NOT_FOUND",
            message: "Executor not found",
          });
        }

        const currentBalance = Number(executor.balance ?? 0);
        executor.balance = (currentBalance + nextAmount).toFixed(2);
        await manager.save(executor);
        lockedTopUp.confirmedAt = new Date();
        lockedTopUp.confirmedById = resolvedActorId;
      }

      lockedTopUp.amount = nextAmount.toFixed(2);
      lockedTopUp.status = dto.status;
      lockedTopUp.adminComment =
        dto.adminComment?.trim() || lockedTopUp.adminComment;
      return manager.save(lockedTopUp);
    });
    const updatedTopUp = await this.balanceTopUpsRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ["executor", "executor.user"],
    });

    await this.recordActivity(
      actorId,
      "executor.updated",
      "executor",
      updatedTopUp.executorId,
      {
        balanceTopUpId: updatedTopUp.id,
        balanceTopUpStatus: updatedTopUp.status,
        amount: updatedTopUp.amount,
      },
    );

    if (updatedTopUp.status !== previousStatus) {
      await this.notifyExecutorBalanceTopUpStatus(updatedTopUp);
    }

    return updatedTopUp;
  }

  listExecutorPayouts(
    status?: ExecutorPayoutStatus,
  ): Promise<ExecutorPayoutEntity[]> {
    return this.payoutsRepository.find({
      where: status ? { status } : {},
      relations: ["executor", "executor.user"],
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async createExecutorPayout(
    dto: CreateExecutorPayoutDto,
    actorId: string,
  ): Promise<ExecutorPayoutEntity> {
    const executor = await this.getExecutor(dto.executorId);
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        code: "PAYOUT_AMOUNT_INVALID",
        message: "Payout amount is invalid",
      });
    }

    const payout = await this.payoutsRepository.save(
      this.payoutsRepository.create({
        executorId: executor.id,
        amount: amount.toFixed(2),
        method: dto.method ?? "kaspi",
        status: "pending",
        adminComment: dto.adminComment?.trim() || null,
      }),
    );

    await this.recordActivity(
      actorId,
      "executor.updated",
      "executor",
      executor.id,
      {
        payoutId: payout.id,
        payoutStatus: payout.status,
        amount: payout.amount,
      },
    );

    return this.payoutsRepository.findOneOrFail({
      where: { id: payout.id },
      relations: ["executor", "executor.user"],
    });
  }

  async updateExecutorPayout(
    payoutId: string,
    dto: UpdateExecutorPayoutDto,
    actorId: string,
  ): Promise<ExecutorPayoutEntity> {
    const payout = await this.payoutsRepository.findOne({
      where: { id: payoutId },
      relations: ["executor", "executor.user"],
    });
    if (!payout) {
      throw new NotFoundException({
        code: "PAYOUT_NOT_FOUND",
        message: "Payout request not found",
      });
    }

    const nextAmount = dto.amount ?? Number(payout.amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      throw new BadRequestException({
        code: "PAYOUT_AMOUNT_INVALID",
        message: "Payout amount is invalid",
      });
    }

    const resolvedActorId = await this.resolveAdminActorId(actorId);
    const saved = await this.dataSource.transaction(async (manager) => {
      const lockedPayout = await manager.findOne(ExecutorPayoutEntity, {
        where: { id: payoutId },
        lock: { mode: "pessimistic_write" },
      });
      if (!lockedPayout) {
        throw new NotFoundException({
          code: "PAYOUT_NOT_FOUND",
          message: "Payout request not found",
        });
      }

      if (dto.status === "paid" && lockedPayout.status !== "paid") {
        const executor = await manager.findOne(ExecutorEntity, {
          where: { id: lockedPayout.executorId },
          lock: { mode: "pessimistic_write" },
        });
        if (!executor) {
          throw new NotFoundException({
            code: "EXECUTOR_NOT_FOUND",
            message: "Executor not found",
          });
        }

        const currentBalance = Number(executor.balance ?? 0);
        if (currentBalance < nextAmount) {
          throw new BadRequestException({
            code: "PAYOUT_BALANCE_INSUFFICIENT",
            message: "Executor balance is not enough for payout",
          });
        }

        executor.balance = (currentBalance - nextAmount).toFixed(2);
        await manager.save(executor);
        lockedPayout.paidAt = new Date();
        lockedPayout.paidById = resolvedActorId;
      }

      lockedPayout.amount = nextAmount.toFixed(2);
      lockedPayout.status = dto.status;
      lockedPayout.method = dto.method ?? lockedPayout.method;
      lockedPayout.adminComment =
        dto.adminComment?.trim() || lockedPayout.adminComment;
      return manager.save(lockedPayout);
    });

    const updatedPayout = await this.payoutsRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ["executor", "executor.user"],
    });

    await this.recordActivity(
      actorId,
      "executor.updated",
      "executor",
      updatedPayout.executorId,
      {
        payoutId: updatedPayout.id,
        payoutStatus: updatedPayout.status,
        amount: updatedPayout.amount,
      },
    );

    return updatedPayout;
  }

  private async notifyExecutorBalanceTopUpStatus(
    topUp: ExecutorBalanceTopUpEntity,
  ): Promise<void> {
    const userId = topUp.executor?.userId;
    if (!userId) {
      return;
    }

    const type = this.balanceTopUpNotificationType(topUp.status);
    if (!type) {
      return;
    }

    await this.notificationsService.send(
      userId,
      type,
      {
        amount: topUp.amount,
        provider: topUp.invoiceProvider,
        phone: topUp.phone,
        comment: topUp.adminComment ?? "",
      },
      topUp.executor?.user?.preferredLanguage === "kk" ? "kk" : "ru",
    );
  }

  private balanceTopUpNotificationType(
    status: ExecutorBalanceTopUpStatus,
  ):
    | "balance_topup_invoiced"
    | "balance_topup_confirmed"
    | "balance_topup_rejected"
    | null {
    switch (status) {
      case "invoiced":
        return "balance_topup_invoiced";
      case "confirmed":
        return "balance_topup_confirmed";
      case "rejected":
        return "balance_topup_rejected";
      default:
        return null;
    }
  }

  listPromoCodes(): Promise<PromoCodeEntity[]> {
    return this.promoCodesRepository.find({
      order: {
        createdAt: "DESC",
      },
    });
  }

  getPromoCodeDetail(promoCodeId: string): Promise<PromoCodeEntity> {
    return this.getPromoCode(promoCodeId);
  }

  async getPromoCodeAnalytics(
    promoCodeId: string,
    query: PromoCodeAnalyticsQueryDto = {},
  ): Promise<PromoCodeAnalyticsDto> {
    const promoCode = await this.getPromoCode(promoCodeId);
    const ordersQuery = this.ordersRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.city", "city")
      .where("order.promo_code_id = :promoCodeId", { promoCodeId })
      .orderBy("order.createdAt", "DESC");

    if (query.cityId) {
      ordersQuery.andWhere("order.city_id = :cityId", {
        cityId: query.cityId,
      });
    }

    if (query.status) {
      ordersQuery.andWhere("order.status = :status", {
        status: query.status,
      });
    }

    if (query.serviceType) {
      ordersQuery.andWhere("order.service_type = :serviceType", {
        serviceType: query.serviceType,
      });
    }

    if (query.paymentMethod) {
      ordersQuery.andWhere("order.payment_method = :paymentMethod", {
        paymentMethod: query.paymentMethod,
      });
    }

    if (query.dateFrom) {
      ordersQuery.andWhere("order.created_at >= :dateFrom", {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      ordersQuery.andWhere("order.created_at <= :dateTo", {
        dateTo: new Date(query.dateTo),
      });
    }

    if (!query.dateFrom && !query.dateTo && query.period) {
      const range = this.resolvePeriod(query.period);
      ordersQuery.andWhere("order.created_at BETWEEN :from AND :to", {
        from: range.from,
        to: range.to,
      });
    }

    const orders = await ordersQuery.getMany();

    const clientIds = [
      ...new Set(orders.map((order) => order.clientId).filter(Boolean)),
    ];
    const firstOrdersByClient = clientIds.length
      ? await this.ordersRepository
          .createQueryBuilder("order")
          .select("order.client_id", "clientId")
          .addSelect("MIN(order.created_at)", "firstOrderAt")
          .where("order.client_id IN (:...clientIds)", { clientIds })
          .groupBy("order.client_id")
          .getRawMany<{ clientId: string; firstOrderAt: string }>()
      : [];

    const firstOrderAtByClient = new Map(
      firstOrdersByClient.map((entry) => [
        entry.clientId,
        new Date(entry.firstOrderAt).getTime(),
      ]),
    );

    const grossTotalsByCurrency: Record<string, number> = {};
    const discountTotalsByCurrency: Record<string, number> = {};
    const cityBreakdownMap = new Map<
      string,
      PromoCodeAnalyticsCityBreakdownDto
    >();
    const paymentMethodBreakdownMap = new Map<
      string,
      PromoCodeAnalyticsPaymentMethodBreakdownDto
    >();
    const statusBreakdownMap = new Map<
      string,
      PromoCodeAnalyticsStatusBreakdownDto
    >();
    const uniqueClients = new Set<string>();
    let completedOrders = 0;
    let taxiOrders = 0;
    let deliveryOrders = 0;
    let firstTimeRedemptions = 0;
    let repeatRedemptions = 0;
    let lastRedeemedAt: Date | null = null;

    for (const order of orders) {
      const grossAmount = Number(order.finalPrice ?? order.estimatedPrice ?? 0);
      const discountAmount = Number(order.discountAmount ?? 0);
      const createdAtMs = order.createdAt.getTime();

      uniqueClients.add(order.clientId);
      grossTotalsByCurrency[order.currency] =
        (grossTotalsByCurrency[order.currency] ?? 0) + grossAmount;
      discountTotalsByCurrency[order.currency] =
        (discountTotalsByCurrency[order.currency] ?? 0) + discountAmount;

      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.DELIVERED
      ) {
        completedOrders += 1;
      }
      if (order.serviceType === "taxi") {
        taxiOrders += 1;
      } else if (order.serviceType === "delivery") {
        deliveryOrders += 1;
      }
      if (createdAtMs === firstOrderAtByClient.get(order.clientId)) {
        firstTimeRedemptions += 1;
      } else {
        repeatRedemptions += 1;
      }
      if (!lastRedeemedAt || createdAtMs > lastRedeemedAt.getTime()) {
        lastRedeemedAt = order.createdAt;
      }

      const cityBreakdown =
        cityBreakdownMap.get(order.cityId) ??
        (() => {
          const nextValue: PromoCodeAnalyticsCityBreakdownDto = {
            cityId: order.cityId,
            cityNameRu: order.city?.nameRu ?? "",
            cityNameKk: order.city?.nameKk ?? "",
            orderCount: 0,
            completedOrders: 0,
            grossTotalsByCurrency: {},
            discountTotalsByCurrency: {},
          };
          cityBreakdownMap.set(order.cityId, nextValue);
          return nextValue;
        })();

      cityBreakdown.orderCount += 1;
      if (
        order.status === OrderStatus.COMPLETED ||
        order.status === OrderStatus.DELIVERED
      ) {
        cityBreakdown.completedOrders += 1;
      }
      cityBreakdown.grossTotalsByCurrency[order.currency] =
        (cityBreakdown.grossTotalsByCurrency[order.currency] ?? 0) +
        grossAmount;
      cityBreakdown.discountTotalsByCurrency[order.currency] =
        (cityBreakdown.discountTotalsByCurrency[order.currency] ?? 0) +
        discountAmount;

      const paymentMethodBreakdown =
        paymentMethodBreakdownMap.get(order.paymentMethod) ??
        (() => {
          const nextValue: PromoCodeAnalyticsPaymentMethodBreakdownDto = {
            paymentMethod: order.paymentMethod,
            orderCount: 0,
            grossTotalsByCurrency: {},
            discountTotalsByCurrency: {},
          };
          paymentMethodBreakdownMap.set(order.paymentMethod, nextValue);
          return nextValue;
        })();

      paymentMethodBreakdown.orderCount += 1;
      paymentMethodBreakdown.grossTotalsByCurrency[order.currency] =
        (paymentMethodBreakdown.grossTotalsByCurrency[order.currency] ?? 0) +
        grossAmount;
      paymentMethodBreakdown.discountTotalsByCurrency[order.currency] =
        (paymentMethodBreakdown.discountTotalsByCurrency[order.currency] ?? 0) +
        discountAmount;

      const statusBreakdown =
        statusBreakdownMap.get(order.status) ??
        (() => {
          const nextValue: PromoCodeAnalyticsStatusBreakdownDto = {
            status: order.status,
            orderCount: 0,
            grossTotalsByCurrency: {},
            discountTotalsByCurrency: {},
          };
          statusBreakdownMap.set(order.status, nextValue);
          return nextValue;
        })();

      statusBreakdown.orderCount += 1;
      statusBreakdown.grossTotalsByCurrency[order.currency] =
        (statusBreakdown.grossTotalsByCurrency[order.currency] ?? 0) +
        grossAmount;
      statusBreakdown.discountTotalsByCurrency[order.currency] =
        (statusBreakdown.discountTotalsByCurrency[order.currency] ?? 0) +
        discountAmount;
    }

    const totalOrders = orders.length;
    const usageRate =
      promoCode.maxUses && promoCode.maxUses > 0
        ? (totalOrders / promoCode.maxUses) * 100
        : null;
    const completionRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const firstOrderConversion =
      uniqueClients.size > 0
        ? (firstTimeRedemptions / uniqueClients.size) * 100
        : 0;

    return {
      promoCodeId: promoCode.id,
      code: promoCode.code,
      totalOrders,
      completedOrders,
      grossTotalsByCurrency,
      discountTotalsByCurrency,
      taxiOrders,
      deliveryOrders,
      uniqueClients: uniqueClients.size,
      firstTimeRedemptions,
      repeatRedemptions,
      usageRate,
      completionRate,
      firstOrderConversion,
      lastRedeemedAt,
      cityBreakdown: [...cityBreakdownMap.values()].sort(
        (left, right) =>
          right.orderCount - left.orderCount ||
          right.completedOrders - left.completedOrders ||
          left.cityNameRu.localeCompare(right.cityNameRu),
      ),
      paymentMethodBreakdown: [...paymentMethodBreakdownMap.values()].sort(
        (left, right) => right.orderCount - left.orderCount,
      ),
      statusBreakdown: [...statusBreakdownMap.values()].sort(
        (left, right) => right.orderCount - left.orderCount,
      ),
    };
  }

  async createPromoCode(
    actorId: string,
    dto: CreatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    const promoCode = await this.promoCodesRepository.save(
      this.promoCodesRepository.create({
        code: dto.code.trim().toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue.toFixed(2),
        maxUses: dto.maxUses ?? null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        isActive: dto.isActive ?? true,
      }),
    );

    await this.recordActivity(
      actorId,
      "promo_code.created",
      "promo_code",
      promoCode.id,
      {
        code: promoCode.code,
        discountType: promoCode.discountType,
        isActive: promoCode.isActive,
      },
    );

    return promoCode;
  }

  async updatePromoCode(
    promoCodeId: string,
    dto: UpdatePromoCodeDto,
    actorId: string,
  ): Promise<PromoCodeEntity> {
    const promoCode = await this.getPromoCode(promoCodeId);

    const updated = this.promoCodesRepository.merge(promoCode, {
      code: dto.code ? dto.code.trim().toUpperCase() : promoCode.code,
      discountType: dto.discountType ?? promoCode.discountType,
      discountValue:
        dto.discountValue !== undefined
          ? dto.discountValue.toFixed(2)
          : promoCode.discountValue,
      maxUses: dto.maxUses !== undefined ? dto.maxUses : promoCode.maxUses,
      validTo:
        dto.validTo !== undefined
          ? dto.validTo
            ? new Date(dto.validTo)
            : null
          : promoCode.validTo,
      isActive: dto.isActive ?? promoCode.isActive,
    });

    const saved = await this.promoCodesRepository.save(updated);

    await this.recordActivity(
      actorId,
      "promo_code.updated",
      "promo_code",
      saved.id,
      {
        code: dto.code?.trim().toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxUses: dto.maxUses,
        validTo: dto.validTo ?? null,
        isActive: dto.isActive,
      },
    );

    return saved;
  }

  async refundPayment(
    paymentId: string,
    dto: RefundPaymentDto,
    actorId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.refundPayment(paymentId, dto);
    await this.recordActivity(
      actorId,
      "payment.refunded",
      "payment",
      payment.id,
      {
        orderId: payment.orderId,
        amount: dto.amount ?? null,
        reason: dto.reason ?? null,
        status: payment.status,
      },
    );
    return payment;
  }

  async cancelPayment(
    paymentId: string,
    dto: CancelPaymentDto,
    actorId: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.cancelPayment(paymentId, dto);
    await this.recordActivity(
      actorId,
      "payment.cancelled",
      "payment",
      payment.id,
      {
        orderId: payment.orderId,
        reason: dto.reason ?? null,
        status: payment.status,
      },
    );
    return payment;
  }

  async getFinancialReport(query: ReportQueryDto): Promise<FinancialReportDto> {
    const range = this.resolvePeriod(query.period);
    const paymentsQuery = this.paymentsRepository
      .createQueryBuilder("payment")
      .leftJoin("payment.order", "order")
      .where("payment.created_at BETWEEN :from AND :to", {
        from: range.from,
        to: range.to,
      });

    const completedOrdersWhere: Record<string, unknown> = {
      completedAt: Between(range.from, range.to),
      status: OrderStatus.COMPLETED,
    };

    if (query.cityId) {
      paymentsQuery.andWhere("order.city_id = :cityId", {
        cityId: query.cityId,
      });
      completedOrdersWhere.cityId = query.cityId;
    }

    const [payments, completedOrdersCount] = await Promise.all([
      paymentsQuery.getMany(),
      this.ordersRepository.count({
        where: completedOrdersWhere,
      }),
    ]);

    const capturedAmountByCurrency: Record<string, number> = {};
    const refundedAmountByCurrency: Record<string, number> = {};

    for (const payment of payments) {
      const currency = payment.currency;
      if (payment.status === PaymentStatus.CAPTURED) {
        capturedAmountByCurrency[currency] =
          (capturedAmountByCurrency[currency] ?? 0) + Number(payment.amount);
      }
      if (
        payment.status === PaymentStatus.REFUNDED ||
        payment.status === PaymentStatus.PARTIALLY_REFUNDED
      ) {
        refundedAmountByCurrency[currency] =
          (refundedAmountByCurrency[currency] ?? 0) +
          Number(payment.refundedAmount);
      }
    }

    return {
      period: query.period ?? "month",
      cityId: query.cityId ?? null,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      paymentsCount: payments.length,
      completedOrdersCount,
      capturedAmountByCurrency,
      refundedAmountByCurrency,
    };
  }

  async getOperationsReport(
    query: ReportQueryDto,
  ): Promise<OperationsReportDto> {
    const range = this.resolvePeriod(query.period);
    const orderWhere: Record<string, unknown> = {
      createdAt: Between(range.from, range.to),
    };
    if (query.cityId) {
      orderWhere.cityId = query.cityId;
    }

    const executorWhere: Record<string, unknown> = {};
    if (query.cityId) {
      executorWhere.cityId = query.cityId;
    }

    const [orders, executors] = await Promise.all([
      this.ordersRepository.find({
        where: orderWhere,
      }),
      this.executorsRepository.find({
        where: executorWhere,
      }),
    ]);

    const ordersByStatus: Record<string, number> = {};
    const ordersByServiceType: Record<string, number> = {};

    for (const order of orders) {
      ordersByStatus[order.status] = (ordersByStatus[order.status] ?? 0) + 1;
      ordersByServiceType[order.serviceType] =
        (ordersByServiceType[order.serviceType] ?? 0) + 1;
    }

    return {
      period: query.period ?? "month",
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      cityId: query.cityId ?? null,
      totalOrders: orders.length,
      ordersByStatus,
      ordersByServiceType,
      activeExecutors: executors.filter((executor) => executor.isOnline).length,
      verifiedExecutors: executors.filter(
        (executor) => executor.verificationStatus === "verified",
      ).length,
    };
  }

  private async toAdminActivity(
    activity: AdminActivityLogEntity[],
  ): Promise<AdminActivityDto[]> {
    const actorIds = [
      ...new Set(
        activity
          .map((entry) => entry.actorId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const actors = actorIds.length
      ? await this.usersRepository.find({
          where: {
            id: In(actorIds),
          },
        })
      : [];
    const actorsById = new Map(actors.map((user) => [user.id, user]));

    return activity.map((entry) => {
      const actor = entry.actorId
        ? (actorsById.get(entry.actorId) ?? null)
        : null;

      return {
        id: entry.id,
        action: entry.action as AdminActivityAction,
        entityType: entry.entityType as AdminActivityEntityType,
        entityId: entry.entityId,
        actorId: entry.actorId,
        actorName: actor?.name ?? actor?.phone ?? null,
        metadata: entry.metadata ?? null,
        createdAt: entry.createdAt,
      };
    });
  }

  private async buildAdminOrderSummary(
    order: OrderEntity,
  ): Promise<AdminOrderSummaryDto> {
    const [routePoints, deliveryDetails, promoCode] = await Promise.all([
      this.routePointsRepository.find({
        where: { orderId: order.id },
        order: { sequenceIndex: "ASC" },
      }),
      this.deliveryDetailsRepository.findOne({
        where: { orderId: order.id },
      }),
      order.promoCodeId
        ? this.promoCodesRepository.findOne({
            where: { id: order.promoCodeId },
          })
        : Promise.resolve(null),
    ]);

    return this.toAdminOrderSummary(
      order,
      routePoints,
      deliveryDetails,
      promoCode?.code ?? order.promoCode?.code ?? null,
    );
  }

  private toAdminOrderDetail(
    order: OrderEntity,
    routePoints: RoutePointEntity[],
    deliveryDetails: DeliveryDetailEntity | null,
    payments: PaymentEntity[],
    statusEvents: OrderStatusEventEntity[],
  ): AdminOrderDetailDto {
    const summary = this.toAdminOrderSummary(
      order,
      routePoints,
      deliveryDetails,
      order.promoCode?.code ?? null,
    );

    return {
      ...summary,
      client: order.client ? this.toAdminOrderParty(order.client) : null,
      executor: order.executor
        ? this.toAdminOrderExecutorParty(order.executor)
        : null,
      city: order.city
        ? {
            id: order.city.id,
            nameRu: order.city.nameRu,
            nameKk: order.city.nameKk,
            currency: order.city.currency,
          }
        : null,
      distanceMeters: order.distanceMeters,
      durationSeconds: order.durationSeconds,
      discountAmount: order.discountAmount,
      acceptedAt: order.acceptedAt,
      startedAt: order.startedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      clientRating: order.clientRating,
      executorRating: order.executorRating,
      updatedAt: order.updatedAt,
      routePoints: routePoints.map((routePoint) => ({
        id: routePoint.id,
        sequenceIndex: routePoint.sequenceIndex,
        lat: routePoint.lat,
        lng: routePoint.lng,
        address: routePoint.address,
        contactName: routePoint.contactName,
        contactPhone: routePoint.contactPhone,
        arrivedAt: routePoint.arrivedAt,
        completedAt: routePoint.completedAt,
        notes: routePoint.notes,
      })),
      delivery: deliveryDetails
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
            proofSignatureUrl: deliveryDetails.proofSignatureUrl,
            recipientCode: deliveryDetails.recipientCode,
            updatedAt: deliveryDetails.updatedAt,
          }
        : null,
      payments: payments.map((payment) => ({
        id: payment.id,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        providerTransactionId: payment.providerTransactionId,
        refundedAmount: payment.refundedAmount,
        capturedAt: payment.capturedAt,
        createdAt: payment.createdAt,
      })),
      statusEvents: statusEvents.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        actorId: event.actorId,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
    };
  }

  private toAdminOrderSummary(
    order: OrderEntity,
    routePoints: RoutePointEntity[],
    deliveryDetails: DeliveryDetailEntity | null,
    promoCodeCode: string | null = null,
  ): AdminOrderSummaryDto {
    return {
      id: order.id,
      serviceType: order.serviceType,
      status: order.status,
      clientId: order.clientId,
      executorId: order.executorId,
      cityId: order.cityId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      estimatedPrice: order.estimatedPrice,
      finalPrice: order.finalPrice,
      discountAmount: order.discountAmount,
      promoCodeId: order.promoCodeId,
      promoCodeCode: promoCodeCode ?? order.promoCode?.code ?? null,
      pickupAddress: routePoints[0]?.address ?? null,
      destinationAddress: routePoints.at(-1)?.address ?? null,
      deliveryStatus: deliveryDetails?.deliveryStatus ?? null,
      createdAt: order.createdAt,
      scheduledAt: order.scheduledAt,
    };
  }

  private async toAdminNotes(
    notes: AdminNoteEntity[],
  ): Promise<AdminNoteDto[]> {
    const relatedUserIds = [
      ...new Set(
        notes
          .flatMap((note) => [note.createdById, note.assignedToId])
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const authors = relatedUserIds.length
      ? await this.usersRepository.find({
          where: {
            id: In(relatedUserIds),
          },
        })
      : [];
    const authorsById = new Map(authors.map((user) => [user.id, user]));

    return notes.map((note) => {
      const author = note.createdById
        ? (authorsById.get(note.createdById) ?? null)
        : null;

      return {
        id: note.id,
        entityType: note.entityType as AdminNoteEntityType,
        entityId: note.entityId,
        body: note.body,
        kind: (note.kind ?? "context") as AdminNoteKind,
        isPinned: note.isPinned ?? false,
        state: this.normalizeAdminNoteState(note.state),
        createdById: note.createdById,
        createdByName: author?.name ?? author?.phone ?? null,
        assignedToId: note.assignedToId ?? null,
        assignedToName: note.assignedToId
          ? (authorsById.get(note.assignedToId)?.name ??
            authorsById.get(note.assignedToId)?.phone ??
            null)
          : null,
        createdAt: note.createdAt,
        resolvedAt: note.resolvedAt ?? null,
        archivedAt: note.archivedAt ?? null,
        updatedAt: note.updatedAt,
      };
    });
  }

  private async recordActivity(
    actorId: string,
    action: AdminActivityAction,
    entityType: AdminActivityEntityType,
    entityId: string,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    await this.adminActivityLogsRepository.save(
      this.adminActivityLogsRepository.create({
        actorId: await this.resolveAdminActorId(actorId),
        action,
        entityType,
        entityId,
        metadata: this.compactActivityMetadata(metadata ?? null),
      }),
    );
  }

  private async resolveAdminActorId(actorId: string): Promise<string | null> {
    const exists = await this.usersRepository.exists({
      where: { id: actorId },
    });
    return exists ? actorId : null;
  }

  private compactActivityMetadata(
    metadata: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }

    const compact = Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined),
    );

    return Object.keys(compact).length > 0 ? compact : null;
  }

  private async getAdminNoteDto(noteId: string): Promise<AdminNoteDto> {
    const note = await this.findAdminNote(noteId);
    const [dto] = await this.toAdminNotes([note]);
    return dto;
  }

  private toAdminOrderParty(user: UserEntity): AdminOrderPartyDto {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      isBlocked: user.isBlocked,
    };
  }

  private toAdminOrderExecutorParty(
    executor: ExecutorEntity,
  ): AdminOrderExecutorPartyDto {
    return {
      id: executor.id,
      userId: executor.userId,
      name: executor.user?.name ?? null,
      phone: executor.user?.phone ?? "",
      isBlocked: Boolean(executor.user?.isBlocked),
      executorType: executor.executorType,
      vehicleType: executor.vehicleType,
      carClass: executor.carClass,
      isOnline: executor.isOnline,
      verificationStatus: executor.verificationStatus,
    };
  }

  private resolvePeriod(period: "day" | "week" | "month" | undefined): {
    from: Date;
    to: Date;
  } {
    const to = new Date();
    const from = new Date(to);

    switch (period) {
      case "day":
        from.setDate(to.getDate() - 1);
        break;
      case "week":
        from.setDate(to.getDate() - 7);
        break;
      case "month":
      default:
        from.setMonth(to.getMonth() - 1);
        break;
    }

    return { from, to };
  }

  private encodeCursor(order: OrderEntity): string {
    return Buffer.from(
      JSON.stringify({
        createdAt: order.createdAt.toISOString(),
        id: order.id,
      }),
    ).toString("base64url");
  }

  private decodeCursor(value?: string): { createdAt: Date; id: string } | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(
        Buffer.from(value, "base64url").toString("utf8"),
      ) as {
        createdAt: string;
        id: string;
      };
      return {
        createdAt: new Date(parsed.createdAt),
        id: parsed.id,
      };
    } catch {
      return null;
    }
  }

  private async findUser(userId: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }
    return user;
  }

  private async findAdminNote(noteId: string): Promise<AdminNoteEntity> {
    const note = await this.adminNotesRepository.findOne({
      where: { id: noteId },
    });
    if (!note) {
      throw new NotFoundException({
        code: "ADMIN_NOTE_NOT_FOUND",
        message: "Admin note not found",
      });
    }
    return note;
  }

  private normalizeAdminNoteState(
    value: string | null | undefined,
  ): AdminNoteState {
    if (value === "resolved" || value === "archived") {
      return value;
    }
    return "open";
  }

  private applyAdminNoteState(
    note: AdminNoteEntity,
    state: AdminNoteState,
  ): void {
    note.state = state;
    if (state === "open") {
      note.resolvedAt = null;
      note.archivedAt = null;
      return;
    }
    if (state === "resolved") {
      note.resolvedAt = new Date();
      note.archivedAt = null;
      return;
    }
    note.archivedAt = new Date();
    if (!note.resolvedAt) {
      note.resolvedAt = new Date();
    }
  }

  private async findOrder(orderId: string): Promise<OrderEntity> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
      });
    }
    return order;
  }

  private async getOrCreateDriverBonusSettings(): Promise<DriverBonusSettingEntity> {
    const existing = await this.driverBonusSettingsRepository.findOne({
      where: { key: "default" },
    });
    if (existing) {
      return existing;
    }

    return this.driverBonusSettingsRepository.save(
      this.driverBonusSettingsRepository.create({
        key: "default",
        isEnabled: true,
        ordersRequired: 20,
        bonusAmount: "5000.00",
      }),
    );
  }

  private serializeDriverBonusSettings(
    settings: DriverBonusSettingEntity,
  ): DriverBonusSettingsDto {
    return {
      isEnabled: settings.isEnabled,
      ordersRequired: settings.ordersRequired,
      bonusAmount: Number(settings.bonusAmount),
    };
  }

  private async ensureNoteTargetExists(
    entityType: AdminNoteEntityType,
    entityId: string,
  ): Promise<void> {
    switch (entityType) {
      case "order":
        await this.findOrder(entityId);
        return;
      case "user":
        await this.findUser(entityId);
        return;
      case "executor":
        await this.getExecutor(entityId);
        return;
      case "city":
        await this.getCity(entityId);
        return;
      case "tariff":
        await this.getTariff(entityId);
        return;
      case "promo_code":
        await this.getPromoCode(entityId);
        return;
    }
  }

  private async getCity(cityId: string): Promise<CityEntity> {
    const city = await this.citiesRepository.findOne({
      where: { id: cityId },
    });
    if (!city) {
      throw new NotFoundException({
        code: "CITY_NOT_FOUND",
        message: "City not found",
      });
    }
    return city;
  }

  private async getTariff(tariffId: string): Promise<TariffEntity> {
    const tariff = await this.tariffsRepository.findOne({
      where: { id: tariffId },
    });
    if (!tariff) {
      throw new NotFoundException({
        code: "TARIFF_NOT_FOUND",
        message: "Tariff not found",
      });
    }
    return tariff;
  }

  private async getPromoCode(promoCodeId: string): Promise<PromoCodeEntity> {
    const promoCode = await this.promoCodesRepository.findOne({
      where: { id: promoCodeId },
    });
    if (!promoCode) {
      throw new NotFoundException({
        code: "PROMO_CODE_NOT_FOUND",
        message: "Promo code not found",
      });
    }
    return promoCode;
  }
}

import {
  Currency,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
} from "@dos/shared-types";
import { In } from "typeorm";

import { CityEntity } from "../../modules/admin/entities/city.entity";
import { TariffEntity } from "../../modules/admin/entities/tariff.entity";
import { buildDefaultTariffs } from "../../modules/admin/tariff-defaults";
import { ExecutorEntity } from "../../modules/executors/entities/executor.entity";
import { ExecutorLocationEntity } from "../../modules/executors/entities/executor-location.entity";
import { OrderStatusEventEntity } from "../../modules/orders/entities/order-status-event.entity";
import { OrderEntity } from "../../modules/orders/entities/order.entity";
import { RoutePointEntity } from "../../modules/orders/entities/route-point.entity";
import { PaymentEntity } from "../../modules/payments/entities/payment.entity";
import { PromoCodeEntity } from "../../modules/promo-codes/entities/promo-code.entity";
import { UserEntity } from "../../modules/users/entities/user.entity";
import appDataSource from "../data-source";

const DEV_ADMIN_USER_ID =
  process.env.DEV_ADMIN_USER_ID ?? "00000000-0000-4000-8000-000000000001";
const DEV_CLIENT_USER_ID =
  process.env.DEV_CLIENT_USER_ID ?? "00000000-0000-4000-8000-000000000002";
const DEV_EXECUTOR_USER_ID =
  process.env.DEV_EXECUTOR_USER_ID ?? "00000000-0000-4000-8000-000000000003";
const DEV_EXECUTOR_ID =
  process.env.DEV_EXECUTOR_ID ?? "00000000-0000-4000-8000-000000000011";
const DEV_PROMO_CODE_ID =
  process.env.DEV_PROMO_CODE_ID ?? "00000000-0000-4000-8000-000000000021";
const DEV_ORDER_ID =
  process.env.DEV_ORDER_ID ?? "00000000-0000-4000-8000-000000000031";
const DEV_PAYMENT_ID =
  process.env.DEV_PAYMENT_ID ?? "00000000-0000-4000-8000-000000000041";
const DEV_ADMIN_PHONE = process.env.DEV_ADMIN_PHONE ?? "+77000000001";
const DEV_CLIENT_PHONE = process.env.DEV_CLIENT_PHONE ?? "+77000000002";
const DEV_EXECUTOR_PHONE = process.env.DEV_EXECUTOR_PHONE ?? "+77000000003";

async function seed(): Promise<void> {
  await appDataSource.initialize();

  const cityRepository = appDataSource.getRepository(CityEntity);
  const tariffRepository = appDataSource.getRepository(TariffEntity);
  const userRepository = appDataSource.getRepository(UserEntity);
  const executorRepository = appDataSource.getRepository(ExecutorEntity);
  const executorLocationRepository = appDataSource.getRepository(
    ExecutorLocationEntity,
  );
  const promoCodeRepository = appDataSource.getRepository(PromoCodeEntity);
  const orderRepository = appDataSource.getRepository(OrderEntity);
  const routePointRepository = appDataSource.getRepository(RoutePointEntity);
  const orderStatusEventRepository = appDataSource.getRepository(
    OrderStatusEventEntity,
  );
  const paymentRepository = appDataSource.getRepository(PaymentEntity);

  let almaty = await cityRepository.findOne({
    where: { nameRu: "Алматы" },
  });

  if (!almaty) {
    almaty = cityRepository.create({
      nameRu: "Алматы",
      nameKk: "Алматы",
      countryCode: "KZ",
      currency: Currency.KZT,
      timezone: "Asia/Almaty",
      isActive: true,
      serviceZone: {
        type: "Polygon",
        coordinates: [
          [
            [76.74, 43.38],
            [77.18, 43.38],
            [77.18, 43.06],
            [76.74, 43.06],
            [76.74, 43.38],
          ],
        ],
      },
    });
    almaty = await cityRepository.save(almaty);
  }

  const existingTariffs = await tariffRepository.count({
    where: { cityId: almaty.id },
  });

  if (existingTariffs === 0) {
    const validFrom = new Date();
    const tariffs = tariffRepository.create(
      buildDefaultTariffs().map((tariff) => ({
        cityId: almaty.id,
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
        currency: Currency.KZT,
        validFrom,
        validTo: null,
        isActive: true,
        createdById: null,
      })),
    );

    await tariffRepository.save(tariffs);
  }

  await userRepository.save(
    userRepository.create({
      id: DEV_ADMIN_USER_ID,
      phone: DEV_ADMIN_PHONE,
      name: "Dev Admin",
      preferredLanguage: "ru",
      preferredCurrency: Currency.KZT,
      bonusBalance: "0.00",
      isBlocked: false,
    }),
  );

  const clientUser = await userRepository.save(
    userRepository.create({
      id: DEV_CLIENT_USER_ID,
      phone: DEV_CLIENT_PHONE,
      name: "Demo Client",
      preferredLanguage: "ru",
      preferredCurrency: Currency.KZT,
      bonusBalance: "250.00",
      isBlocked: false,
    }),
  );

  const executorUser = await userRepository.save(
    userRepository.create({
      id: DEV_EXECUTOR_USER_ID,
      phone: DEV_EXECUTOR_PHONE,
      name: "Demo Driver",
      preferredLanguage: "ru",
      preferredCurrency: Currency.KZT,
      bonusBalance: "0.00",
      isBlocked: false,
    }),
  );

  const staleSmokeOrders = await orderRepository
    .createQueryBuilder("orders")
    .select("orders.id", "id")
    .where("orders.client_id = :clientId", { clientId: clientUser.id })
    .andWhere("orders.id != :seedOrderId", { seedOrderId: DEV_ORDER_ID })
    .getRawMany<{ id: string }>();
  const staleSmokeOrderIds = staleSmokeOrders.map((order) => order.id);

  if (staleSmokeOrderIds.length > 0) {
    await paymentRepository.delete({ orderId: In(staleSmokeOrderIds) });
    await appDataSource
      .createQueryBuilder()
      .delete()
      .from("delivery_details")
      .where("order_id IN (:...orderIds)", { orderIds: staleSmokeOrderIds })
      .execute();
    await appDataSource
      .createQueryBuilder()
      .delete()
      .from("dispatch_offers")
      .where("order_id IN (:...orderIds)", { orderIds: staleSmokeOrderIds })
      .execute();
    await routePointRepository.delete({ orderId: In(staleSmokeOrderIds) });
    await orderStatusEventRepository.delete({
      orderId: In(staleSmokeOrderIds),
    });
    await orderRepository.delete({ id: In(staleSmokeOrderIds) });
  }

  const executor = await executorRepository.save(
    executorRepository.create({
      id: DEV_EXECUTOR_ID,
      userId: executorUser.id,
      executorType: ExecutorType.DRIVER,
      vehicleType: null,
      carClass: "economy",
      isOnline: true,
      rating: "4.92",
      cancelRate: "1.20",
      balance: "18500.00",
      cityId: almaty.id,
      verificationStatus: "verified",
    }),
  );

  await orderRepository.update(
    {
      clientId: clientUser.id,
      status: In([
        OrderStatus.DRAFT,
        OrderStatus.SEARCHING,
        OrderStatus.ACCEPTED,
        OrderStatus.ARRIVING,
        OrderStatus.WAITING,
        OrderStatus.IN_PROGRESS,
      ]),
    },
    {
      status: OrderStatus.CANCELLED_SYSTEM,
      cancelledAt: new Date(),
      cancelReason: "Reset by development seed",
    },
  );

  await executorLocationRepository.save(
    executorLocationRepository.create({
      executorId: executor.id,
      lat: 43.238949,
      lng: 76.889709,
      heading: 90,
    }),
  );

  const promoCode = await promoCodeRepository.save(
    promoCodeRepository.create({
      id: DEV_PROMO_CODE_ID,
      code: "DEVPROMO",
      discountType: "fixed",
      discountValue: "300.00",
      maxUses: 100,
      validTo: null,
      isActive: true,
    }),
  );

  const completedAt = new Date("2025-01-05T09:30:00.000Z");
  const startedAt = new Date("2025-01-05T09:05:00.000Z");
  const acceptedAt = new Date("2025-01-05T08:58:00.000Z");

  const order = await orderRepository.save(
    orderRepository.create({
      id: DEV_ORDER_ID,
      clientId: clientUser.id,
      executorId: executor.id,
      serviceType: ServiceType.TAXI,
      status: OrderStatus.COMPLETED,
      cityId: almaty.id,
      currency: Currency.KZT,
      estimatedPrice: "2400.00",
      finalPrice: "2100.00",
      distanceMeters: 10500,
      durationSeconds: 1500,
      paymentMethod: PaymentMethod.CARD,
      promoCodeId: promoCode.id,
      discountAmount: "300.00",
      scheduledAt: null,
      acceptedAt,
      startedAt,
      completedAt,
      cancelledAt: null,
      cancelReason: null,
      clientRating: 5,
      executorRating: 5,
    }),
  );

  await routePointRepository.delete({ orderId: order.id });
  await routePointRepository.save([
    routePointRepository.create({
      orderId: order.id,
      sequenceIndex: 0,
      lat: 43.238949,
      lng: 76.889709,
      address: "пр. Абая 10, Алматы",
      contactName: clientUser.name,
      contactPhone: clientUser.phone,
      arrivedAt: acceptedAt,
      completedAt: startedAt,
      notes: "Sample pickup point for local admin smoke",
    }),
    routePointRepository.create({
      orderId: order.id,
      sequenceIndex: 1,
      lat: 43.25654,
      lng: 76.92848,
      address: "ул. Панфилова 125, Алматы",
      contactName: null,
      contactPhone: null,
      arrivedAt: completedAt,
      completedAt,
      notes: "Sample destination point for local admin smoke",
    }),
  ]);

  await orderStatusEventRepository.delete({ orderId: order.id });
  await orderStatusEventRepository.save([
    orderStatusEventRepository.create({
      orderId: order.id,
      fromStatus: OrderStatus.DRAFT,
      toStatus: OrderStatus.SEARCHING,
      actorId: clientUser.id,
      metadata: { source: "dev_seed" },
    }),
    orderStatusEventRepository.create({
      orderId: order.id,
      fromStatus: OrderStatus.SEARCHING,
      toStatus: OrderStatus.ACCEPTED,
      actorId: executorUser.id,
      metadata: { source: "dev_seed" },
    }),
    orderStatusEventRepository.create({
      orderId: order.id,
      fromStatus: OrderStatus.ACCEPTED,
      toStatus: OrderStatus.IN_PROGRESS,
      actorId: executorUser.id,
      metadata: { source: "dev_seed" },
    }),
    orderStatusEventRepository.create({
      orderId: order.id,
      fromStatus: OrderStatus.IN_PROGRESS,
      toStatus: OrderStatus.COMPLETED,
      actorId: executorUser.id,
      metadata: { source: "dev_seed" },
    }),
  ]);

  await paymentRepository.save(
    paymentRepository.create({
      id: DEV_PAYMENT_ID,
      orderId: order.id,
      status: PaymentStatus.CAPTURED,
      method: PaymentMethod.CARD,
      amount: "2100.00",
      currency: Currency.KZT,
      exchangeRate: "1.000000",
      amountBase: "2100.00",
      provider: "stub",
      providerTransactionId: "stub-dev-payment-001",
      idempotencyKey: "dev-seed-payment-001",
      capturedAt: completedAt,
      refundedAmount: "0.00",
    }),
  );

  await appDataSource.destroy();
}

void seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Development seed completed");
  })
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Development seed failed", error);
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
    process.exitCode = 1;
  });

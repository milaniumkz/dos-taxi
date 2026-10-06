import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { DispatchModule } from "../dispatch/dispatch.module";
import { DriverBonusSettingEntity } from "../executors/entities/driver-bonus-setting.entity";
import { ExecutorBalanceTopUpEntity } from "../executors/entities/executor-balance-top-up.entity";
import { ExecutorPayoutEntity } from "../executors/entities/executor-payout.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { OrderStatusEventEntity } from "../orders/entities/order-status-event.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { RoutePointEntity } from "../orders/entities/route-point.entity";
import { OrdersModule } from "../orders/orders.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentEntity } from "../payments/entities/payment.entity";
import { PaymentsModule } from "../payments/payments.module";
import { PromoCodeEntity } from "../promo-codes/entities/promo-code.entity";
import { UserEntity } from "../users/entities/user.entity";

import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminBookingService } from "./admin-booking.service";
import { AdminCreationController } from "./admin-creation.controller";
import { AdminActivityLogEntity } from "./entities/admin-activity-log.entity";
import { AdminNoteEntity } from "./entities/admin-note.entity";
import { CityEntity } from "./entities/city.entity";
import { TariffEntity } from "./entities/tariff.entity";

@Module({
  imports: [
    AuthModule,
    OrdersModule,
    PaymentsModule,
    DispatchModule,
    NotificationsModule,
    TypeOrmModule.forFeature([
      CityEntity,
      TariffEntity,
      OrderEntity,
      RoutePointEntity,
      OrderStatusEventEntity,
      DeliveryDetailEntity,
      AdminActivityLogEntity,
      AdminNoteEntity,
      DriverBonusSettingEntity,
      UserEntity,
      ExecutorEntity,
      ExecutorBalanceTopUpEntity,
      ExecutorPayoutEntity,
      PromoCodeEntity,
      PaymentEntity,
    ]),
  ],
  controllers: [AdminController, AdminCreationController],
  providers: [AdminService, AdminBookingService],
})
export class AdminModule {}

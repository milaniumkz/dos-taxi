import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CityEntity } from "../admin/entities/city.entity";
import { AuthModule } from "../auth/auth.module";
import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { DispatchModule } from "../dispatch/dispatch.module";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { DriverBonusPayoutEntity } from "../executors/entities/driver-bonus-payout.entity";
import { DriverBonusSettingEntity } from "../executors/entities/driver-bonus-setting.entity";
import { GeoModule } from "../geo/geo.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { UserEntity } from "../users/entities/user.entity";

import { OrderStatusEventEntity } from "./entities/order-status-event.entity";
import { OrderChatMessageEntity } from "./entities/order-chat-message.entity";
import { OrderEntity } from "./entities/order.entity";
import { RoutePointEntity } from "./entities/route-point.entity";
import { ExecutorOrdersController } from "./executor-orders.controller";
import { OrderChatService } from "./order-chat.service";
import { OrdersRealtimeService } from "./orders-realtime.service";
import { OrdersController } from "./orders.controller";
import { PromoCodeEntity } from "../promo-codes/entities/promo-code.entity";
import { PromoCodesService } from "../promo-codes/promo-codes.service";

import { OrdersService } from "./orders.service";

@Module({
  imports: [
    AuthModule,
    forwardRef(() => DispatchModule),
    GeoModule,
    NotificationsModule,
    PricingModule,
    TypeOrmModule.forFeature([
      CityEntity,
      OrderEntity,
      PromoCodeEntity,
      OrderChatMessageEntity,
      OrderStatusEventEntity,
      RoutePointEntity,
      DeliveryDetailEntity,
      ExecutorEntity,
      DriverBonusPayoutEntity,
      DriverBonusSettingEntity,
      UserEntity,
    ]),
  ],
  controllers: [OrdersController, ExecutorOrdersController],
  providers: [
    PromoCodesService,
    OrdersService,
    OrdersRealtimeService,
    OrderChatService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}

import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { AuthModule } from "../auth/auth.module";
import { DeliveryDetailEntity } from "../delivery/entities/delivery-detail.entity";
import { ExecutorLocationEntity } from "../executors/entities/executor-location.entity";
import { ExecutorEntity } from "../executors/entities/executor.entity";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrderStatusEventEntity } from "../orders/entities/order-status-event.entity";
import { RoutePointEntity } from "../orders/entities/route-point.entity";
import { OrdersModule } from "../orders/orders.module";
import { UserEntity } from "../users/entities/user.entity";

import { DispatchQueueService } from "./dispatch-queue.service";
import { DispatchGateway } from "./dispatch.gateway";
import { DispatchRealtimeService } from "./dispatch-realtime.service";
import { DispatchController } from "./dispatch.controller";
import { DispatchService } from "./dispatch.service";
import { DispatchOfferEntity } from "./entities/dispatch-offer.entity";

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    forwardRef(() => OrdersModule),
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderStatusEventEntity,
      RoutePointEntity,
      DispatchOfferEntity,
      ExecutorEntity,
      ExecutorLocationEntity,
      UserEntity,
      DeliveryDetailEntity,
    ]),
  ],
  controllers: [DispatchController],
  providers: [
    DispatchService,
    DispatchQueueService,
    DispatchGateway,
    DispatchRealtimeService,
    RedisStoreService,
  ],
  exports: [DispatchService, DispatchQueueService, DispatchRealtimeService],
})
export class DispatchModule {}

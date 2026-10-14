import { RideMarketplaceGuard } from "./ride-marketplace.guard";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";
import { RideMarketplaceController } from "./ride-marketplace.controller";
import { RideMarketplaceService } from "./ride-marketplace.service";
@Module({
  imports: [AuthModule, OrdersModule, NotificationsModule],
  controllers: [RideMarketplaceController],
  providers: [RideMarketplaceService, RideMarketplaceGuard],
  exports: [RideMarketplaceService],
})
export class RideMarketplaceModule {}

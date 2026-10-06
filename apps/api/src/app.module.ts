import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import { validateEnvironment } from "./config/env.validation";
import jwtConfig from "./config/jwt.config";
import redisConfig from "./config/redis.config";
import { DatabaseModule } from "./database/database.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DispatchModule } from "./modules/dispatch/dispatch.module";
import { ExecutorsModule } from "./modules/executors/executors.module";
import { GeoModule } from "./modules/geo/geo.module";
import { HealthModule } from "./modules/health/health.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { SupportModule } from "./modules/support/support.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: [".env.local", ".env"],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    AdminModule,
    AuthModule,
    DispatchModule,
    ExecutorsModule,
    GeoModule,
    HealthModule,
    NotificationsModule,
    OrdersModule,
    PaymentsModule,
    SupportModule,
    UsersModule,
  ],
})
export class AppModule {}

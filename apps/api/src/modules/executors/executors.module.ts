import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RedisStoreService } from "../../shared/cache/redis-store.service";
import { S3StorageService } from "../../shared/storage/s3-storage.service";
import { CityEntity } from "../admin/entities/city.entity";
import { AuthModule } from "../auth/auth.module";
import { UserEntity } from "../users/entities/user.entity";

import { ExecutorBalanceTopUpEntity } from "./entities/executor-balance-top-up.entity";
import { ExecutorDocumentEntity } from "./entities/executor-document.entity";
import { ExecutorLocationEntity } from "./entities/executor-location.entity";
import { ExecutorEntity } from "./entities/executor.entity";
import { ExecutorsController } from "./executors.controller";
import { DriverBonusesService } from "./driver-bonuses.service";
import { DriverBonusSettingEntity } from "./entities/driver-bonus-setting.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { ExecutorsService } from "./executors.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      CityEntity,
      ExecutorEntity,
      DriverBonusSettingEntity,
      OrderEntity,
      ExecutorBalanceTopUpEntity,
      ExecutorLocationEntity,
      ExecutorDocumentEntity,
    ]),
    AuthModule,
  ],
  controllers: [ExecutorsController],
  providers: [
    DriverBonusesService,
    ExecutorsService,
    RedisStoreService,
    S3StorageService,
  ],
  exports: [ExecutorsService],
})
export class ExecutorsModule {}

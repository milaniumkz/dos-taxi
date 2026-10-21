import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { TopUpSettingsEntity } from "./topup-settings.entity";
import { TopUpSettingsService } from "./topup-settings.service";
import {
  AdminTopUpSettingsController,
  ExecutorTopUpSettingsController,
} from "./topup-settings.controller";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([TopUpSettingsEntity])],
  controllers: [AdminTopUpSettingsController, ExecutorTopUpSettingsController],
  providers: [TopUpSettingsService],
  exports: [TopUpSettingsService],
})
export class TopUpSettingsModule {}

import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminActivityLogEntity } from "../admin/entities/admin-activity-log.entity";
import { UserEntity } from "../users/entities/user.entity";
import {
  TOPUP_SETTINGS_ID,
  TopUpSettingsEntity,
} from "./topup-settings.entity";
import { TopUpSettingsDto } from "./topup-settings.dto";

@Injectable()
export class TopUpSettingsService {
  constructor(
    @InjectRepository(TopUpSettingsEntity)
    private readonly repository: Repository<TopUpSettingsEntity>,
  ) {}

  async get(): Promise<TopUpSettingsDto> {
    const settings = await this.repository.findOneBy({ id: TOPUP_SETTINGS_ID });
    return {
      mode: settings?.mode ?? "manual",
      kaspiUrl: settings?.kaspiUrl ?? "",
    };
  }

  async update(
    actorId: string,
    dto: TopUpSettingsDto,
  ): Promise<TopUpSettingsDto> {
    if (dto.mode === "kaspi_link" && !dto.kaspiUrl) {
      throw new BadRequestException({
        code: "TOPUP_LINK_REQUIRED",
        message: "Kaspi link is required",
      });
    }
    const settings = { mode: dto.mode, kaspiUrl: dto.kaspiUrl };
    await this.repository.manager.transaction(async (manager) => {
      await manager.upsert(
        TopUpSettingsEntity,
        { id: TOPUP_SETTINGS_ID, ...settings },
        ["id"],
      );
      const actor = await manager.findOneBy(UserEntity, { id: actorId });
      await manager.save(AdminActivityLogEntity, {
        actorId: actor?.id ?? null,
        action: "driver.topup.settings.updated",
        entityType: "settings",
        entityId: TOPUP_SETTINGS_ID,
        metadata: settings,
      });
    });
    return settings;
  }

  async assertManualEnabled(): Promise<void> {
    if ((await this.get()).mode !== "manual") {
      throw new BadRequestException({
        code: "MANUAL_TOPUP_DISABLED",
        message: "Manual top-up requests are disabled",
      });
    }
  }
}

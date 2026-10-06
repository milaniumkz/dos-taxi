import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

import {
  adminActivityActions,
  adminActivityEntityTypes,
  type AdminActivityAction,
  type AdminActivityEntityType,
} from "./admin-activity.dto";

export const adminActivityGroups = [
  "order",
  "payment",
  "note",
  "moderation",
] as const;
export type AdminActivityGroup = (typeof adminActivityGroups)[number];

export const adminActivityWindows = ["hour", "day", "week"] as const;
export type AdminActivityWindow = (typeof adminActivityWindows)[number];

export class ListAdminActivityQueryDto {
  @ApiPropertyOptional({ enum: adminActivityEntityTypes })
  @IsOptional()
  @IsString()
  @IsIn(adminActivityEntityTypes)
  entityType?: AdminActivityEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ enum: adminActivityActions })
  @IsOptional()
  @IsString()
  @IsIn(adminActivityActions)
  action?: AdminActivityAction;

  @ApiPropertyOptional({ enum: adminActivityGroups })
  @IsOptional()
  @IsString()
  @IsIn(adminActivityGroups)
  group?: AdminActivityGroup;

  @ApiPropertyOptional({ enum: adminActivityWindows })
  @IsOptional()
  @IsString()
  @IsIn(adminActivityWindows)
  window?: AdminActivityWindow;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorQuery?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

export const adminNoteEntityTypes = [
  "order",
  "user",
  "executor",
  "city",
  "tariff",
  "promo_code",
] as const;
export const adminNoteKinds = ["context", "handoff", "escalation"] as const;
export const adminNoteStates = ["open", "resolved", "archived"] as const;

export type AdminNoteEntityType = (typeof adminNoteEntityTypes)[number];
export type AdminNoteKind = (typeof adminNoteKinds)[number];
export type AdminNoteState = (typeof adminNoteStates)[number];

export class AdminNoteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: adminNoteEntityTypes })
  entityType!: AdminNoteEntityType;

  @ApiProperty()
  entityId!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: adminNoteKinds })
  kind!: AdminNoteKind;

  @ApiProperty()
  isPinned!: boolean;

  @ApiProperty({ enum: adminNoteStates })
  state!: AdminNoteState;

  @ApiPropertyOptional()
  createdById!: string | null;

  @ApiPropertyOptional()
  createdByName!: string | null;

  @ApiPropertyOptional()
  assignedToId!: string | null;

  @ApiPropertyOptional()
  assignedToName!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  resolvedAt!: Date | null;

  @ApiPropertyOptional()
  archivedAt!: Date | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class CreateAdminNoteDto {
  @ApiProperty({ enum: adminNoteEntityTypes })
  @IsString()
  @IsIn(adminNoteEntityTypes)
  entityType!: AdminNoteEntityType;

  @ApiProperty()
  @IsUUID()
  entityId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  body!: string;

  @ApiPropertyOptional({ enum: adminNoteKinds, default: "context" })
  @IsOptional()
  @IsString()
  @IsIn(adminNoteKinds)
  kind?: AdminNoteKind;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) {
      return true;
    }
    if (value === "false" || value === false) {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === undefined) {
      return undefined;
    }
    if (value === null || value === "null") {
      return null;
    }
    return value;
  })
  @IsUUID()
  assignedToId?: string | null;
}

export class UpdateAdminNoteDto {
  @ApiPropertyOptional({ enum: adminNoteKinds })
  @IsOptional()
  @IsString()
  @IsIn(adminNoteKinds)
  kind?: AdminNoteKind;

  @ApiPropertyOptional({ enum: adminNoteStates })
  @IsOptional()
  @IsString()
  @IsIn(adminNoteStates)
  state?: AdminNoteState;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) {
      return true;
    }
    if (value === "false" || value === false) {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === undefined) {
      return undefined;
    }
    if (value === null || value === "null") {
      return null;
    }
    return value;
  })
  @IsUUID()
  assignedToId?: string | null;
}

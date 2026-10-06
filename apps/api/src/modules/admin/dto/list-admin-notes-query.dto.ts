import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  adminNoteEntityTypes,
  adminNoteKinds,
  adminNoteStates,
  AdminNoteEntityType,
  AdminNoteKind,
  AdminNoteState,
} from "./admin-note.dto";

export class ListAdminNotesQueryDto {
  @ApiPropertyOptional({ enum: adminNoteEntityTypes })
  @IsOptional()
  @IsString()
  @IsIn(adminNoteEntityTypes)
  entityType?: AdminNoteEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorQuery?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeQuery?: string;

  @ApiPropertyOptional()
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
  hasAssignee?: boolean;

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

  @ApiPropertyOptional()
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
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number;
}

import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, Max, Min } from "class-validator";

export class DispatchSettingsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(30)
  maxRadiusKm!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  distanceWeight!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  ratingWeight!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  activityWeight!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  priorityWeight!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxCandidates!: number;
}

export class UpdateDispatchSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(30)
  maxRadiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  distanceWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  ratingWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  activityWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  priorityWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxCandidates?: number;
}

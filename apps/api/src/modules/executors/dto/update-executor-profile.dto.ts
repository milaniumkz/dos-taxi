import { CourierVehicleType, ExecutorType } from "@dos/shared-types";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

import {
  normalizeVehiclePlate,
  vehiclePlatePattern,
} from "../../../shared/validators/vehicle-plate.validator";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class UpdateExecutorProfileDto {
  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @IsIn([ExecutorType.DRIVER, ExecutorType.COURIER, ExecutorType.CARGO_DRIVER])
  executorType?: ExecutorType;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @IsIn([
    CourierVehicleType.BICYCLE,
    CourierVehicleType.MOPED,
    CourierVehicleType.SCOOTER,
    CourierVehicleType.CAR,
  ])
  vehicleType?: CourierVehicleType;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @Length(1, 50)
  carClass?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @Length(1, 80)
  vehicleMake?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @Length(1, 80)
  vehicleModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2035)
  vehicleYear?: number;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @Length(1, 40)
  vehicleColor?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Transform(({ value }) =>
    normalizeVehiclePlate(emptyStringToUndefined(value)),
  )
  @Matches(vehiclePlatePattern)
  vehiclePlate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(["economy", "comfort", "comfort_plus", "business", "together", "child"], { each: true })
  enabledTariffs?: string[];

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @Matches(/^(ru|kk)$/)
  preferredLanguage?: string;
}

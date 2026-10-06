import { CourierVehicleType, ExecutorType } from "@dos/shared-types";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
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

export class UpdateAdminExecutorDto {
  @IsOptional()
  @IsString()
  @IsIn([ExecutorType.DRIVER, ExecutorType.COURIER, ExecutorType.CARGO_DRIVER])
  executorType?: ExecutorType;

  @IsOptional()
  @IsString()
  @IsIn([
    CourierVehicleType.BICYCLE,
    CourierVehicleType.MOPED,
    CourierVehicleType.SCOOTER,
    CourierVehicleType.CAR,
  ])
  vehicleType?: CourierVehicleType | null;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  carClass?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  vehicleMake?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  vehicleModel?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(2035)
  vehicleYear?: number | null;

  @IsOptional()
  @IsString()
  @Length(1, 40)
  vehicleColor?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  @Transform(({ value }) => normalizeVehiclePlate(value))
  @Matches(vehiclePlatePattern)
  vehiclePlate?: string | null;

  @IsOptional()
  @IsUUID()
  cityId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(["pending", "verified", "rejected"])
  verificationStatus?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlocked?: boolean;
}

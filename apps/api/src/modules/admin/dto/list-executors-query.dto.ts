import { CourierVehicleType, ExecutorType } from "@dos/shared-types";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ListExecutorsQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsUUID()
  cityId?: string;

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
  vehicleType?: CourierVehicleType;

  @IsOptional()
  @IsString()
  @IsIn(["pending", "verified", "rejected"])
  verificationStatus?: "pending" | "verified" | "rejected";

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

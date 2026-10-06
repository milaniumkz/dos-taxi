import { Currency, ServiceType } from "@dos/shared-types";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from "class-validator";

export class CreateTariffDto {
  @IsUUID()
  cityId!: string;

  @IsString()
  @IsIn([ServiceType.TAXI, ServiceType.INTERCITY, ServiceType.DELIVERY])
  serviceType!: ServiceType;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  vehicleClass?: string | null;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nameRu!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nameKk!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerKm!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerMinute!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeWaitingSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  paidWaitingPerMinute?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionFixed?: number;

  @IsString()
  @IsIn([Currency.RUB, Currency.KZT])
  currency!: Currency;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

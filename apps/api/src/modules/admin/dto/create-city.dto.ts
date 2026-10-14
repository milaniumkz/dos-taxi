import { ApiPropertyOptional } from "@nestjs/swagger";
import { Currency } from "@dos/shared-types";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  Length,
} from "class-validator";

export class CreateCityDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nameRu!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  nameKk!: string;

  @IsString()
  @Length(2, 3)
  countryCode!: string;

  @IsString()
  @IsIn([Currency.RUB, Currency.KZT])
  currency!: Currency;

  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  timezone!: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  serviceZone?: Record<string, unknown> | null;
  @ApiPropertyOptional({ enum: ["seat", "salon"], default: "seat" })
  @IsOptional()
  @IsIn(["seat", "salon"])
  ridePricingBasis?: "seat" | "salon";
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  rideMinimumOrderKzt?: string;
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  rideExchangeRate?: string;
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  ridePriceStepKzt?: string;
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rideCommissionPercent?: string;
}

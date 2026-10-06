import { Currency } from "@dos/shared-types";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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
}

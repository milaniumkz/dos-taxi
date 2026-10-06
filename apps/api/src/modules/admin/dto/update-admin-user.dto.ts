import { Currency } from "@dos/shared-types";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @Matches(/^(ru|kk)$/)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  @IsIn([Currency.RUB, Currency.KZT])
  preferredCurrency?: Currency;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlocked?: boolean;
}

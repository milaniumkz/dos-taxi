import { Currency } from "@dos/shared-types";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class UpdateProfileDto {
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
}

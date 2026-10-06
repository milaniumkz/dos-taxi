import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";

export class CreatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  code!: string;

  @IsString()
  @IsIn(["fixed", "percent"])
  discountType!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxUses?: number | null;

  @IsOptional()
  @IsDateString()
  validTo?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class DriverBonusSettingsDto {
  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({ example: 20 })
  ordersRequired!: number;

  @ApiProperty({ example: 5000 })
  bonusAmount!: number;
}

export class UpdateDriverBonusSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  ordersRequired?: number;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000000)
  bonusAmount?: number;
}

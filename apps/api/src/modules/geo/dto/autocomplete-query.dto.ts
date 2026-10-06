import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from "class-validator";

export class AutocompleteQueryDto {
  @ApiProperty({ example: "Абая 10" })
  @IsString()
  @Length(2, 255)
  q!: string;

  @ApiPropertyOptional({ example: "city-uuid" })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ example: 43.238949 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 76.889709 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ example: "ru", enum: ["ru", "kk"] })
  @IsOptional()
  @IsString()
  @IsIn(["ru", "kk"])
  lang?: string;
}

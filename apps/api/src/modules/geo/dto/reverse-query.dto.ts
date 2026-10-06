import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReverseQueryDto {
  @ApiProperty({ example: 43.238949 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 76.889709 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ example: "ru", enum: ["ru", "kk"] })
  @IsOptional()
  @IsString()
  @IsIn(["ru", "kk"])
  lang?: string;
}

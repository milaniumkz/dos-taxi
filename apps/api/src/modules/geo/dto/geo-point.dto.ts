import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class GeoPointDto {
  @ApiProperty({ example: 43.238949 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 76.889709 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

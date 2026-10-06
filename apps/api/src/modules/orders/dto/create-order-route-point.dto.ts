import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderRoutePointDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sequenceIndex!: number;

  @ApiProperty({ example: 43.238949 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 76.889709 })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 'Abay Ave 10' })
  @IsString()
  @MaxLength(500)
  address!: string;

  @ApiPropertyOptional({ example: 'Aruzhan' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ example: '+77771234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

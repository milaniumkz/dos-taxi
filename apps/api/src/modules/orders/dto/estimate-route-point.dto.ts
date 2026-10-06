import { ApiProperty } from '@nestjs/swagger';
import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class EstimateRoutePointDto {
  @ApiProperty({ example: 43.238949 })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 76.889709 })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 'Abay Ave 10', required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

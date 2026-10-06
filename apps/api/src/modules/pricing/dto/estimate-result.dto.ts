import { Currency, ServiceType } from '@dos/shared-types';
import { ApiProperty } from '@nestjs/swagger';

export class EstimateResultDto {
  @ApiProperty()
  tariffId!: string;

  @ApiProperty({ enum: ServiceType })
  serviceType!: ServiceType;

  @ApiProperty({ example: 'economy', nullable: true })
  vehicleClass!: string | null;

  @ApiProperty({ example: 1550 })
  estimatedPrice!: number;

  @ApiProperty({ example: 1550 })
  basePrice!: number;

  @ApiProperty({ example: 0 })
  surchargeAmount!: number;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ example: 1 })
  surgeCoefficient!: number;

  @ApiProperty({ example: 1 })
  nightCoefficient!: number;

  @ApiProperty({ example: 5400 })
  distanceMeters!: number;

  @ApiProperty({ example: 960 })
  durationSeconds!: number;

  @ApiProperty({ example: 960 })
  etaSeconds!: number;
}

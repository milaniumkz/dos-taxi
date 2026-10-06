import { CourierVehicleType, ServiceType } from '@dos/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class NearbyExecutorsQueryDto {
  @ApiProperty({ example: 43.238949 })
  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @ApiProperty({ example: 76.889709 })
  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @ApiProperty({
    enum: [ServiceType.TAXI, ServiceType.INTERCITY, ServiceType.DELIVERY],
  })
  @IsString()
  @IsIn([ServiceType.TAXI, ServiceType.INTERCITY, ServiceType.DELIVERY])
  serviceType!: ServiceType.TAXI | ServiceType.INTERCITY | ServiceType.DELIVERY;

  @ApiPropertyOptional({
    enum: [
      CourierVehicleType.BICYCLE,
      CourierVehicleType.MOPED,
      CourierVehicleType.SCOOTER,
      CourierVehicleType.CAR,
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    CourierVehicleType.BICYCLE,
    CourierVehicleType.MOPED,
    CourierVehicleType.SCOOTER,
    CourierVehicleType.CAR,
  ])
  vehicleType?: CourierVehicleType;
}

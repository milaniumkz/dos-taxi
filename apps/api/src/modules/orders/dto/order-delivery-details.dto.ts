import { CourierVehicleType, DeliveryStatus } from '@dos/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderDeliveryDetailsDto {
  @ApiProperty({ enum: CourierVehicleType })
  courierVehicleType!: CourierVehicleType;

  @ApiPropertyOptional()
  packageDescription!: string | null;

  @ApiPropertyOptional()
  packagePhotoUrl!: string | null;

  @ApiPropertyOptional()
  declaredValue!: string | null;

  @ApiProperty()
  isFragile!: boolean;

  @ApiProperty()
  requiresReturn!: boolean;

  @ApiPropertyOptional()
  cashOnDelivery!: string | null;

  @ApiProperty({ enum: DeliveryStatus })
  deliveryStatus!: DeliveryStatus;

  @ApiPropertyOptional()
  proofPhotoUrl!: string | null;

  @ApiPropertyOptional()
  recipientCode!: string | null;
}

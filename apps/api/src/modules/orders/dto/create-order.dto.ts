import {
  CourierVehicleType,
  PaymentMethod,
  ServiceType,
} from '@dos/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { CreateOrderRoutePointDto } from './create-order-route-point.dto';

export class CreateOrderDto {
  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @ApiProperty({ type: [CreateOrderRoutePointDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderRoutePointDto)
  routePoints!: CreateOrderRoutePointDto[];

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({ example: 'economy' })
  @ValidateIf(
    (dto) =>
      dto.serviceType === ServiceType.TAXI ||
      dto.serviceType === ServiceType.INTERCITY,
  )
  @IsOptional()
  @IsString()
  @MaxLength(50)
  carClass?: string;

  @ApiPropertyOptional({ example: 'ALMATY10' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  promoCode?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 5400 })
  @IsOptional()
  @IsInt()
  @Min(1)
  distanceMeters?: number;

  @ApiPropertyOptional({ example: 960 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @ApiPropertyOptional({ enum: CourierVehicleType })
  @ValidateIf((dto) => dto.serviceType === ServiceType.DELIVERY)
  @IsEnum(CourierVehicleType)
  courierVehicleType?: CourierVehicleType;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.serviceType === ServiceType.DELIVERY)
  @IsString()
  @MaxLength(1000)
  packageDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packagePhoto?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.serviceType === ServiceType.DELIVERY)
  @IsBoolean()
  isFragile?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.serviceType === ServiceType.DELIVERY)
  @IsBoolean()
  requiresReturn?: boolean;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashOnDelivery?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  recipientCode?: string;
}

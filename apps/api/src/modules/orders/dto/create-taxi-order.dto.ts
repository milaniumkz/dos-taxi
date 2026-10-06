import {
  PaymentMethod,
  ServiceType,
} from '@dos/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateOrderRoutePointDto } from './create-order-route-point.dto';

export class CreateTaxiOrderDto {
  @ApiProperty({ enum: [ServiceType.TAXI, ServiceType.INTERCITY] })
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
}

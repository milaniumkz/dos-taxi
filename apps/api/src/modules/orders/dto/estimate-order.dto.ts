import { CourierVehicleType, ServiceType } from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { EstimateRoutePointDto } from "./estimate-route-point.dto";

export class EstimateOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  promoCode?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiProperty({ enum: ServiceType })
  @IsEnum(ServiceType)
  serviceType!: ServiceType;

  @ApiPropertyOptional({ example: "economy" })
  @IsOptional()
  @IsString()
  carClass?: string;

  @ApiPropertyOptional({ enum: CourierVehicleType })
  @IsOptional()
  @IsEnum(CourierVehicleType)
  courierVehicleType?: CourierVehicleType;

  @ApiProperty({ example: 5400 })
  @IsInt()
  @Min(1)
  distanceMeters!: number;

  @ApiProperty({ example: 960 })
  @IsInt()
  @Min(1)
  durationSeconds!: number;

  @ApiPropertyOptional({ type: [EstimateRoutePointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateRoutePointDto)
  routePoints?: EstimateRoutePointDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresReturn?: boolean;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declaredValue?: number;

  @ApiPropertyOptional({ example: 12000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cashOnDelivery?: number;
}

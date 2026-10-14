import { ServiceType, PaymentMethod } from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
export class RideRequestPointDto {
  @ApiProperty() @IsLatitude() lat!: number;
  @ApiProperty() @IsLongitude() lng!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) address!: string;
}
export class RideQuoteDto {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  cityId?: string;
  @ApiProperty({ enum: [ServiceType.TAXI, ServiceType.INTERCITY] })
  @IsIn([ServiceType.TAXI, ServiceType.INTERCITY])
  serviceType!: ServiceType;
  @ApiProperty({ type: [RideRequestPointDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => RideRequestPointDto)
  routePoints!: RideRequestPointDto[];
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  passengerCount?: number;
}
export class CreateRideRequestDto extends RideQuoteDto {
  @ApiProperty({ description: "Quote terms fingerprint" })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  termsKey!: string;
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
  @ApiProperty({
    description: "Number of positive price-button steps above the minimum",
    default: 0,
  })
  @IsInt()
  @Min(0)
  @Max(1000)
  priceSteps!: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pickupEntrance?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  pickupComment?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() needsChildSeat?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() sharedRide?: boolean;
}
export class SubmitRideOfferDto {
  @ApiProperty({
    description: "Price-button steps relative to the passenger unit price",
  })
  @IsInt()
  @Min(-1000)
  @Max(1000)
  priceSteps!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasChildSeat?: boolean;
}
export class AcceptRideOfferDto {
  @ApiProperty({ description: "Offer version shown to passenger" })
  @IsInt()
  @Min(1)
  version!: number;
}
export class RideFeedQueryDto {
  @ApiProperty() @Type(() => Number) @IsLatitude() lat!: number;
  @ApiProperty() @Type(() => Number) @IsLongitude() lng!: number;
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  offset?: number;
}

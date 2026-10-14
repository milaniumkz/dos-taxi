import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Currency, ServiceType, PaymentMethod } from "@dos/shared-types";
import { OrderResponseDto } from "../../orders/dto/order-response.dto";
import { RideRequestPointDto } from "./ride-request.dto";
export class RideCityResponseDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() nameRu!: string;
  @ApiProperty() nameKk!: string;
  @ApiProperty({ enum: Currency }) currency!: Currency;
}
export class RideQuoteResponseDto {
  @ApiProperty({ description: "Fingerprint to pass unchanged when submitting" })
  termsKey!: string;
  @ApiProperty({ format: "uuid" }) cityId!: string;
  @ApiProperty() cityName!: string;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty({ enum: ["seat", "salon"] }) pricingBasis!: string;
  @ApiProperty() passengerCount!: number;
  @ApiProperty({ example: "500.00" }) minimumOrderPrice!: string;
  @ApiProperty({ example: "250.00" }) minimumUnitPrice!: string;
  @ApiProperty({ example: "50.00" }) priceStep!: string;
  @ApiProperty({ example: 7 }) exchangeRate!: number;
  @ApiProperty() commissionPercent!: string;
  @ApiProperty() commissionFixed!: string;
}
export class RideOfferResponseDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) orderId!: string;
  @ApiProperty({ format: "uuid" }) executorId!: string;
  @ApiProperty() priceSteps!: number;
  @ApiProperty({ example: "300.00" }) unitPrice!: string;
  @ApiProperty({ example: "600.00" }) totalPrice!: string;
  @ApiProperty() hasChildSeat!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ enum: ["pending", "accepted", "withdrawn", "superseded"] })
  status!: string;
  @ApiProperty({ format: "date-time" }) expiresAt!: string;
  @ApiProperty({ format: "date-time" }) createdAt!: string;
  @ApiProperty({ format: "date-time" }) updatedAt!: string;
  @ApiPropertyOptional() driverName?: string;
  @ApiPropertyOptional() driverRating?: string;
  @ApiPropertyOptional() vehicleMake?: string;
  @ApiPropertyOptional() vehicleModel?: string;
  @ApiPropertyOptional() vehicleColor?: string;
  @ApiPropertyOptional() vehiclePlate?: string;
}
export class RideFeedItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ enum: ServiceType }) serviceType!: ServiceType;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod!: PaymentMethod;
  @ApiProperty() totalPrice!: string;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() minimumUnitPrice!: string;
  @ApiProperty() priceStep!: string;
  @ApiProperty({ enum: ["seat", "salon"] }) pricingBasis!: string;
  @ApiProperty() passengerCount!: number;
  @ApiPropertyOptional({ nullable: true }) pickupEntrance?: string | null;
  @ApiPropertyOptional({ nullable: true }) pickupComment?: string | null;
  @ApiProperty() needsChildSeat!: boolean;
  @ApiProperty() sharedRide!: boolean;
  @ApiProperty({ type: [RideRequestPointDto] })
  routePoints!: RideRequestPointDto[];
  @ApiProperty() pickupDistanceMeters!: number;
  @ApiPropertyOptional({ type: RideOfferResponseDto, nullable: true })
  myOffer?: RideOfferResponseDto | null;
}
export class RideFeedResponseDto {
  @ApiProperty({ type: [RideFeedItemDto] }) items!: RideFeedItemDto[];
  @ApiProperty({ type: Number, nullable: true }) nextOffset!: number | null;
}
export class RideOffersResponseDto {
  @ApiProperty({ type: OrderResponseDto }) order!: OrderResponseDto;
  @ApiProperty({ type: [RideOfferResponseDto] }) items!: RideOfferResponseDto[];
}

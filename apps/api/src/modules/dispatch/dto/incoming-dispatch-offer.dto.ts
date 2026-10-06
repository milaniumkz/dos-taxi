import { Currency, PaymentMethod, ServiceType } from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IncomingDispatchOfferDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty({ enum: ServiceType })
  serviceType!: ServiceType;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ nullable: true })
  clientName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  clientPhone!: string | null;

  @ApiProperty({ nullable: true, example: '1500.00' })
  estimatedPrice!: string | null;

  @ApiProperty({ nullable: true, example: 5400 })
  distanceMeters!: number | null;

  @ApiProperty({ nullable: true, example: 960 })
  durationSeconds!: number | null;

  @ApiProperty({ nullable: true })
  pickupAddress!: string | null;

  @ApiProperty({ nullable: true })
  pickupLat!: number | null;

  @ApiProperty({ nullable: true })
  pickupLng!: number | null;

  @ApiProperty({ nullable: true })
  destinationAddress!: string | null;

  @ApiProperty({ nullable: true })
  destinationLat!: number | null;

  @ApiProperty({ nullable: true })
  destinationLng!: number | null;

  @ApiProperty()
  offeredAt!: Date;
}

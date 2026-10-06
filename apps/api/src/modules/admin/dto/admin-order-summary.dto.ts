import {
  Currency,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AdminOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ServiceType })
  serviceType!: ServiceType;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  clientId!: string;

  @ApiPropertyOptional()
  executorId!: string | null;

  @ApiProperty()
  cityId!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional()
  estimatedPrice!: string | null;

  @ApiPropertyOptional()
  finalPrice!: string | null;

  @ApiProperty()
  discountAmount!: string;

  @ApiPropertyOptional()
  promoCodeId!: string | null;

  @ApiPropertyOptional()
  promoCodeCode!: string | null;

  @ApiPropertyOptional()
  pickupAddress!: string | null;

  @ApiPropertyOptional()
  destinationAddress!: string | null;

  @ApiPropertyOptional({ enum: DeliveryStatus })
  deliveryStatus!: DeliveryStatus | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  scheduledAt!: Date | null;
}

import { OrderStatus, PaymentMethod } from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PromoCodeAnalyticsCityBreakdownDto {
  @ApiProperty()
  cityId!: string;

  @ApiProperty()
  cityNameRu!: string;

  @ApiProperty()
  cityNameKk!: string;

  @ApiProperty()
  orderCount!: number;

  @ApiProperty()
  completedOrders!: number;

  @ApiProperty({ additionalProperties: { type: "number" } })
  grossTotalsByCurrency!: Record<string, number>;

  @ApiProperty({ additionalProperties: { type: "number" } })
  discountTotalsByCurrency!: Record<string, number>;
}

export class PromoCodeAnalyticsPaymentMethodBreakdownDto {
  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiProperty()
  orderCount!: number;

  @ApiProperty({ additionalProperties: { type: "number" } })
  grossTotalsByCurrency!: Record<string, number>;

  @ApiProperty({ additionalProperties: { type: "number" } })
  discountTotalsByCurrency!: Record<string, number>;
}

export class PromoCodeAnalyticsStatusBreakdownDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  orderCount!: number;

  @ApiProperty({ additionalProperties: { type: "number" } })
  grossTotalsByCurrency!: Record<string, number>;

  @ApiProperty({ additionalProperties: { type: "number" } })
  discountTotalsByCurrency!: Record<string, number>;
}

export class PromoCodeAnalyticsDto {
  @ApiProperty()
  promoCodeId!: string;

  @ApiPropertyOptional({ nullable: true })
  code!: string | null;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  completedOrders!: number;

  @ApiProperty({ additionalProperties: { type: "number" } })
  grossTotalsByCurrency!: Record<string, number>;

  @ApiProperty({ additionalProperties: { type: "number" } })
  discountTotalsByCurrency!: Record<string, number>;

  @ApiProperty()
  taxiOrders!: number;

  @ApiProperty()
  deliveryOrders!: number;

  @ApiProperty()
  uniqueClients!: number;

  @ApiProperty()
  firstTimeRedemptions!: number;

  @ApiProperty()
  repeatRedemptions!: number;

  @ApiPropertyOptional({ nullable: true })
  usageRate!: number | null;

  @ApiProperty()
  completionRate!: number;

  @ApiProperty()
  firstOrderConversion!: number;

  @ApiPropertyOptional({ nullable: true })
  lastRedeemedAt!: Date | null;

  @ApiProperty({ type: [PromoCodeAnalyticsCityBreakdownDto] })
  cityBreakdown!: PromoCodeAnalyticsCityBreakdownDto[];

  @ApiProperty({ type: [PromoCodeAnalyticsPaymentMethodBreakdownDto] })
  paymentMethodBreakdown!: PromoCodeAnalyticsPaymentMethodBreakdownDto[];

  @ApiProperty({ type: [PromoCodeAnalyticsStatusBreakdownDto] })
  statusBreakdown!: PromoCodeAnalyticsStatusBreakdownDto[];
}

import {
  Currency,
  OrderStatus,
  PaymentMethod,
  ServiceType,
} from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { CreateOrderRoutePointDto } from "./create-order-route-point.dto";
import { OrderDeliveryDetailsDto } from "./order-delivery-details.dto";

export class OrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ServiceType })
  serviceType!: ServiceType;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  cityId!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional()
  promoCodeId!: string | null;

  @ApiProperty()
  discountAmount!: string;

  @ApiPropertyOptional()
  executorId!: string | null;

  @ApiPropertyOptional()
  clientName?: string | null;

  @ApiPropertyOptional()
  clientPhone?: string | null;

  @ApiPropertyOptional()
  estimatedPrice!: string | null;

  @ApiPropertyOptional()
  finalPrice!: string | null;

  @ApiPropertyOptional()
  distanceMeters!: number | null;

  @ApiPropertyOptional()
  durationSeconds!: number | null;

  @ApiPropertyOptional()
  carClass!: string | null;

  @ApiPropertyOptional()
  scheduledAt!: Date | null;

  @ApiPropertyOptional()
  acceptedAt!: Date | null;

  @ApiPropertyOptional()
  startedAt!: Date | null;

  @ApiPropertyOptional()
  completedAt!: Date | null;

  @ApiPropertyOptional()
  cancelledAt!: Date | null;

  @ApiPropertyOptional()
  cancelReason!: string | null;

  @ApiPropertyOptional()
  executorRating!: number | null;

  @ApiPropertyOptional()
  executorName?: string | null;

  @ApiPropertyOptional()
  executorPhone?: string | null;

  @ApiPropertyOptional()
  executorVehicleLabel?: string | null;

  @ApiPropertyOptional()
  executorVehiclePlate?: string | null;

  @ApiPropertyOptional()
  executorProfileRating?: number | null;

  @ApiProperty({ type: [CreateOrderRoutePointDto] })
  routePoints!: CreateOrderRoutePointDto[];

  @ApiPropertyOptional({ type: OrderDeliveryDetailsDto })
  deliveryDetails?: OrderDeliveryDetailsDto;

  @ApiProperty()
  createdAt!: Date;
}

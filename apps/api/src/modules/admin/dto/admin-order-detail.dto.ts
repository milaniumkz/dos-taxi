import {
  CourierVehicleType,
  Currency,
  DeliveryStatus,
  ExecutorType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { AdminOrderSummaryDto } from "./admin-order-summary.dto";

export class AdminOrderPartyDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  name!: string | null;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  isBlocked!: boolean;
}

export class AdminOrderExecutorPartyDto extends AdminOrderPartyDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ enum: ExecutorType })
  executorType!: ExecutorType;

  @ApiPropertyOptional({ enum: CourierVehicleType })
  vehicleType!: CourierVehicleType | null;

  @ApiPropertyOptional()
  carClass!: string | null;

  @ApiProperty()
  isOnline!: boolean;

  @ApiProperty()
  verificationStatus!: string;
}

export class AdminOrderCityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nameRu!: string;

  @ApiProperty()
  nameKk!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;
}

export class AdminOrderRoutePointDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sequenceIndex!: number;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  @ApiProperty()
  address!: string;

  @ApiPropertyOptional()
  contactName!: string | null;

  @ApiPropertyOptional()
  contactPhone!: string | null;

  @ApiPropertyOptional()
  arrivedAt!: Date | null;

  @ApiPropertyOptional()
  completedAt!: Date | null;

  @ApiPropertyOptional()
  notes!: string | null;
}

export class AdminOrderDeliveryDetailDto {
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
  proofSignatureUrl!: string | null;

  @ApiPropertyOptional()
  recipientCode!: string | null;

  @ApiProperty()
  updatedAt!: Date;
}

export class AdminOrderPaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiPropertyOptional()
  provider!: string | null;

  @ApiPropertyOptional()
  providerTransactionId!: string | null;

  @ApiProperty()
  refundedAmount!: string;

  @ApiPropertyOptional()
  capturedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AdminOrderStatusEventDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  fromStatus!: OrderStatus | null;

  @ApiProperty({ enum: OrderStatus })
  toStatus!: OrderStatus;

  @ApiPropertyOptional()
  actorId!: string | null;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;
}

export class AdminOrderDetailDto extends AdminOrderSummaryDto {
  @ApiPropertyOptional({ type: AdminOrderPartyDto })
  client!: AdminOrderPartyDto | null;

  @ApiPropertyOptional({ type: AdminOrderExecutorPartyDto })
  executor!: AdminOrderExecutorPartyDto | null;

  @ApiPropertyOptional({ type: AdminOrderCityDto })
  city!: AdminOrderCityDto | null;

  @ApiPropertyOptional()
  distanceMeters!: number | null;

  @ApiPropertyOptional()
  durationSeconds!: number | null;

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
  clientRating!: number | null;

  @ApiPropertyOptional()
  executorRating!: number | null;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [AdminOrderRoutePointDto] })
  routePoints!: AdminOrderRoutePointDto[];

  @ApiPropertyOptional({ type: AdminOrderDeliveryDetailDto })
  delivery!: AdminOrderDeliveryDetailDto | null;

  @ApiProperty({ type: [AdminOrderPaymentDto] })
  payments!: AdminOrderPaymentDto[];

  @ApiProperty({ type: [AdminOrderStatusEventDto] })
  statusEvents!: AdminOrderStatusEventDto[];
}

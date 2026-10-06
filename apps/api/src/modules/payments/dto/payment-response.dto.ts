import {
  Currency,
  PaymentMethod,
  PaymentStatus,
} from '@dos/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentResponseDto {
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

  @ApiPropertyOptional()
  orderId!: string | null;

  @ApiPropertyOptional()
  capturedAt!: Date | null;

  @ApiPropertyOptional()
  refundedAmount!: string;

  @ApiPropertyOptional()
  idempotencyKey!: string | null;
}

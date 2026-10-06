import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentCardResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  last4!: string;

  @ApiProperty()
  brand!: string;

  @ApiPropertyOptional()
  holderName!: string | null;

  @ApiPropertyOptional()
  expMonth!: number | null;

  @ApiPropertyOptional()
  expYear!: number | null;

  @ApiProperty()
  isDefault!: boolean;
}

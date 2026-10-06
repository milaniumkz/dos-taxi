import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class PayOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  cardId!: string;

  @ApiProperty({ example: 'pay-order-123' })
  @IsString()
  @MaxLength(255)
  idempotencyKey!: string;
}

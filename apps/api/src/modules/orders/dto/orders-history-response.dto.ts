import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { OrderResponseDto } from './order-response.dto';

export class OrdersHistoryResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiPropertyOptional()
  nextCursor!: string | null;
}

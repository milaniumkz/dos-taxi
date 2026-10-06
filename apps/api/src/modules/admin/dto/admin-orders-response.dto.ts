import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { AdminOrderSummaryDto } from "./admin-order-summary.dto";

export class AdminOrdersResponseDto {
  @ApiProperty({ type: [AdminOrderSummaryDto] })
  items!: AdminOrderSummaryDto[];

  @ApiPropertyOptional()
  nextCursor!: string | null;
}

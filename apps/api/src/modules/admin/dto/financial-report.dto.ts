import { ApiProperty } from "@nestjs/swagger";

export class FinancialReportDto {
  @ApiProperty()
  period!: string;

  @ApiProperty({ nullable: true })
  cityId!: string | null;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty()
  paymentsCount!: number;

  @ApiProperty()
  completedOrdersCount!: number;

  @ApiProperty({ additionalProperties: { type: "number" } })
  capturedAmountByCurrency!: Record<string, number>;

  @ApiProperty({ additionalProperties: { type: "number" } })
  refundedAmountByCurrency!: Record<string, number>;
}

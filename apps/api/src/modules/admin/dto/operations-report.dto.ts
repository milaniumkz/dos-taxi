import { ApiProperty } from "@nestjs/swagger";

export class OperationsReportDto {
  @ApiProperty()
  period!: string;

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ nullable: true })
  cityId!: string | null;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty({ additionalProperties: { type: "number" } })
  ordersByStatus!: Record<string, number>;

  @ApiProperty({ additionalProperties: { type: "number" } })
  ordersByServiceType!: Record<string, number>;

  @ApiProperty()
  activeExecutors!: number;

  @ApiProperty()
  verifiedExecutors!: number;
}

import { ApiProperty } from "@nestjs/swagger";

export class DriverStatisticsDto {
  @ApiProperty({ description: "All-time completed orders across all services" })
  completedOrders!: number;
  @ApiProperty({ description: "All-time orders cancelled by this driver" })
  cancelledByDriver!: number;
  @ApiProperty({
    description: "Completed orders with a passenger rating from 1 to 5",
  })
  ratedOrders!: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "Mean passenger rating on completed orders, rounded to 2 decimals. Null before the first rating.",
  })
  rating!: number | null;
  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      "100 * completed / (completed + cancelled by driver), rounded to 1 decimal. Client/system cancellations and active orders excluded. Null without eligible orders.",
  })
  activityPercent!: number | null;
}

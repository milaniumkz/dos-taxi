import { Currency } from "@dos/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class DriverBonusProgressDto {
  @ApiProperty({ description: "Calendar date of daily bonus progress" })
  bonusDate!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty() ordersRequired!: number;
  @ApiProperty() bonusAmount!: number;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty() totalCompletedOrders!: number;
  @ApiProperty() completedInCycle!: number;
  @ApiProperty() remainingOrders!: number;
  @ApiProperty() nextThreshold!: number;
}

import { Currency } from "@dos/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class DriverBonusProgressDto {
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty() ordersRequired!: number;
  @ApiProperty() bonusAmount!: number;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty() totalCompletedOrders!: number;
  @ApiProperty() completedInCycle!: number;
  @ApiProperty() remainingOrders!: number;
  @ApiProperty() nextThreshold!: number;
}

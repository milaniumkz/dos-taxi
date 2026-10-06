import { OrderStatus } from "@dos/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAdminOrderStatusDto {
  @ApiProperty({
    enum: [OrderStatus.CANCELLED_SYSTEM, OrderStatus.FAILED],
    description:
      "Restricted admin-only terminal transitions for operational incident handling.",
  })
  @IsIn([OrderStatus.CANCELLED_SYSTEM, OrderStatus.FAILED])
  status!: OrderStatus.CANCELLED_SYSTEM | OrderStatus.FAILED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

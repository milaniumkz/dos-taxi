import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  ExecutorPayoutMethod,
  ExecutorPayoutStatus,
} from "../../executors/entities/executor-payout.entity";

export class CreateExecutorPayoutDto {
  @ApiProperty()
  @IsUUID()
  executorId!: string;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amount!: number;

  @ApiPropertyOptional({ enum: ["kaspi", "halyk", "cash"] })
  @IsOptional()
  @IsIn(["kaspi", "halyk", "cash"])
  method?: ExecutorPayoutMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminComment?: string;
}

export class UpdateExecutorPayoutDto {
  @ApiProperty({ enum: ["pending", "paid", "rejected"] })
  @IsIn(["pending", "paid", "rejected"])
  status!: ExecutorPayoutStatus;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000000)
  amount?: number;

  @ApiPropertyOptional({ enum: ["kaspi", "halyk", "cash"] })
  @IsOptional()
  @IsIn(["kaspi", "halyk", "cash"])
  method?: ExecutorPayoutMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  adminComment?: string;
}

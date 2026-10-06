import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateBalanceTopUpDto {
  @ApiPropertyOptional({ enum: ["invoiced", "confirmed", "rejected"] })
  @IsIn(["invoiced", "confirmed", "rejected"])
  status!: "invoiced" | "confirmed" | "rejected";

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  amount?: number;

  @ApiPropertyOptional({ example: "Счёт Kaspi выставлен" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminComment?: string;
}

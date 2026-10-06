import { IsIn, IsOptional, IsUUID } from "class-validator";

export class ReportQueryDto {
  @IsOptional()
  @IsIn(["day", "week", "month"])
  period?: "day" | "week" | "month";

  @IsOptional()
  @IsUUID()
  cityId?: string;
}

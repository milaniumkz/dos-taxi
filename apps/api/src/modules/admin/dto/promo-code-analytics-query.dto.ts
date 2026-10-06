import { OrderStatus, PaymentMethod, ServiceType } from "@dos/shared-types";
import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";

export class PromoCodeAnalyticsQueryDto {
  @IsOptional()
  @IsIn(["day", "week", "month"])
  period?: "day" | "week" | "month";

  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;

  @IsOptional()
  @IsIn(Object.values(ServiceType))
  serviceType?: ServiceType;

  @IsOptional()
  @IsIn(Object.values(PaymentMethod))
  paymentMethod?: PaymentMethod;
}

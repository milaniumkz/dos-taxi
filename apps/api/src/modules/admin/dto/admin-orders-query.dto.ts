import { OrderStatus, PaymentMethod, ServiceType } from "@dos/shared-types";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class AdminOrdersQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(Object.values(OrderStatus))
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(ServiceType))
  serviceType?: ServiceType;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(PaymentMethod))
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  promoCodeId?: string;

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
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  limit?: number;
}

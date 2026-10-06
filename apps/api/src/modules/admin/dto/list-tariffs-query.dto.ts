import { ServiceType } from "@dos/shared-types";
import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from "class-validator";

export class ListTariffsQueryDto {
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @IsOptional()
  @IsString()
  @IsIn([ServiceType.TAXI, ServiceType.INTERCITY, ServiceType.DELIVERY])
  serviceType?: ServiceType;

  @IsOptional()
  @IsString()
  vehicleClass?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

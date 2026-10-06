import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { ServiceType } from "@dos/shared-types";
import { CreateOrderDto } from "../../orders/dto/create-order.dto";

export class CreateAdminOrderDto extends CreateOrderDto {
  @ApiProperty({ example: "+77010000000" })
  @Matches(/^\+[1-9][0-9]{9,14}$/)
  clientPhone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientName?: string;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  @IsNotEmpty()
  override cityId: string = "";

  @ApiProperty({
    enum: [ServiceType.TAXI, ServiceType.DELIVERY, ServiceType.INTERCITY],
  })
  @IsIn([ServiceType.TAXI, ServiceType.DELIVERY, ServiceType.INTERCITY])
  override serviceType: ServiceType = ServiceType.TAXI;
}

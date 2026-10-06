import { PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

import { CreateTariffDto } from "./create-tariff.dto";

export class UpdateTariffDto extends PartialType(CreateTariffDto) {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  override isActive?: boolean;
}

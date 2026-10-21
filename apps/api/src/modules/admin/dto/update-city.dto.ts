import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { CreateCityDto } from "./create-city.dto";
export class UpdateCityDto extends PartialType(CreateCityDto) {
  @ApiPropertyOptional({
    type: Number,
    description: "RUB minimum, only for Baikonur manual pricing",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(499.99)
  rideMinimumOrderRub?: string;
}

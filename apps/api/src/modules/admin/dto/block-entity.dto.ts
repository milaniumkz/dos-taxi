import { Type } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class BlockEntityDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlocked?: boolean;
}

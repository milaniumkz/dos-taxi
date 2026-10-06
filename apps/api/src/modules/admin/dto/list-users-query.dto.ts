import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsIn(["ru", "kk"])
  preferredLanguage?: "ru" | "kk";

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}

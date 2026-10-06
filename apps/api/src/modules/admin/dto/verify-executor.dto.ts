import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class VerifyExecutorDto {
  @IsOptional()
  @IsString()
  @IsIn(["pending", "verified", "rejected"])
  verificationStatus?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  @IsIn(["economy", "comfort", "comfort_plus", "business"])
  carClass?: string;
}

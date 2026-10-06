import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateBalanceTopUpDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  @Max(1000000)
  amount!: number;

  @ApiProperty({ example: "+77001234567" })
  @IsString()
  @MaxLength(32)
  phone!: string;
}

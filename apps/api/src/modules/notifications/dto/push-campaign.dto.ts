import { ApiProperty } from "@nestjs/swagger";
import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

export class PushCampaignDto {
  @ApiProperty({
    description: "Stable request UUID to prevent duplicate broadcasts",
  })
  @IsUUID()
  id!: string;
  @ApiProperty({ enum: ["all", "passenger", "driver"] })
  @IsIn(["all", "passenger", "driver"])
  audience!: "all" | "passenger" | "driver";
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(100)
  title!: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  body!: string;
}

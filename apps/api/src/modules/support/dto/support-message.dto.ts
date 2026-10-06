import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class SendSupportMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  body!: string;
}

export class SupportMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ["user", "operator"] })
  sender!: "user" | "operator";

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: Date;
}

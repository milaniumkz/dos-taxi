import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class SendOrderChatMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  body!: string;
}

export class OrderChatMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ["client", "executor"] })
  sender!: "client" | "executor";

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: Date;
}

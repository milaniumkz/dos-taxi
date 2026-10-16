import { Transform } from "class-transformer";
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export class SupportContactsDto {
  @ApiProperty({
    description: "Support phone in international format, or empty to hide",
  })
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  @Matches(/^(?:\+[1-9]\d{6,14})?$/)
  phone!: string;

  @ApiProperty({
    description: "WhatsApp phone in international format, or empty to hide",
  })
  @Transform(trim)
  @IsString()
  @MaxLength(32)
  @Matches(/^(?:\+[1-9]\d{6,14})?$/)
  whatsapp!: string;

  @ApiProperty({ description: "Support email, or empty to hide" })
  @Transform(trim)
  @IsString()
  @MaxLength(254)
  @ValidateIf((_object, value) => value !== "")
  @IsEmail()
  email!: string;

  @ApiProperty({ description: "HTTPS t.me contact link, or empty to hide" })
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  @Matches(/^(?:https:\/\/t\.me\/[A-Za-z0-9_]{5,32})?$/)
  telegram!: string;
}

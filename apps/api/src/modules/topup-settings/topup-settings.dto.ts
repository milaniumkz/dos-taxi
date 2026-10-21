import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsString, IsUrl, MaxLength, ValidateIf } from "class-validator";
import { TOPUP_MODES, TopUpMode } from "./topup-settings.entity";

export class TopUpSettingsDto {
  @ApiProperty({ enum: TOPUP_MODES })
  @IsIn(TOPUP_MODES)
  mode!: TopUpMode;

  @ApiProperty({
    description:
      "Kaspi HTTPS universal link; required in kaspi_link mode, otherwise may be empty",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MaxLength(2048)
  @ValidateIf((_object, value) => value !== "")
  @IsUrl({ protocols: ["https"], require_protocol: true, disallow_auth: true })
  kaspiUrl!: string;
}

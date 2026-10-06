import { ApiProperty } from '@nestjs/swagger';

export class SendOtpResponseDto {
  @ApiProperty()
  expiresInSeconds!: number;

  @ApiProperty({ required: false, nullable: true })
  devCode?: string | null;
}

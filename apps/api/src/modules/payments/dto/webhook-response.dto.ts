import { ApiProperty } from '@nestjs/swagger';

export class WebhookResponseDto {
  @ApiProperty()
  processed!: boolean;

  @ApiProperty()
  duplicated!: boolean;
}

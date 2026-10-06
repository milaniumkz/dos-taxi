import { ApiProperty } from '@nestjs/swagger';

export class AddressSuggestionResponseDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  subtitle!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;
}

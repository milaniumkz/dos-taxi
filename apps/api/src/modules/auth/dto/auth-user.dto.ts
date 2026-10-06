import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  preferredLanguage!: string;

  @ApiProperty()
  preferredCurrency!: string;
}

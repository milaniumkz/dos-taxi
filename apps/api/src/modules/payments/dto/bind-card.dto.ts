import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BindCardDto {
  @ApiPropertyOptional({ example: 'tok_test_123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  token?: string;

  @ApiPropertyOptional({ example: '4000 00** **** 2458' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  panMask?: string;

  @ApiPropertyOptional({ example: 'ARUZHAN TLEGEN' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  holderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  makeDefault?: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class KaspiQueryDto {
  @ApiProperty({ enum: ['check', 'pay'] })
  @IsIn(['check', 'pay'])
  command!: 'check' | 'pay';

  @ApiProperty({
    example: '123456789012345678',
    description: 'String: up to 18 digits, never a JS number',
  })
  @IsString()
  @Matches(/^\d{1,18}$/)
  txn_id!: string;

  @ApiProperty({
    example: '77010000000',
    description: 'Registered executor phone, 11 digits beginning with 7',
  })
  @IsString()
  @Matches(/^7\d{10}$/)
  account!: string;

  @ApiProperty({
    example: '5000.00',
    description: 'KZT, exactly two decimal places; ignored for check',
  })
  @IsString()
  @MaxLength(13)
  @Matches(/^\d{1,10}\.\d{2}$/)
  sum!: string;

  @ApiPropertyOptional({
    example: '20261007140000',
    description: 'Required for pay; bank accounting date YYYYMMDDhhmmss',
  })
  @IsOptional()
  @Matches(/^\d{14}$/)
  txn_date?: string;
}

export class KaspiResponseDto {
  @ApiProperty() txn_id!: string;
  @ApiProperty({ enum: [0, 1, 2, 3, 4, 5] }) result!: number;
  @ApiProperty() comment!: string;
  @ApiPropertyOptional() prv_txn_id?: string;
  @ApiPropertyOptional({ example: '5000.00' }) sum?: string;
}

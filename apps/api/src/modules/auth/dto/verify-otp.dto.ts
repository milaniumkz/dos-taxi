import { Transform } from 'class-transformer';
import { normalizeAuthPhone } from '../../../shared/validators/phone.validator';
import { UserRole } from '@dos/shared-types';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/)
  @Transform(({ value }) => normalizeAuthPhone(value))
  phone!: string;

  @IsString()
  @Length(4, 4)
  code!: string;

  @IsString()
  @IsIn([UserRole.CLIENT, UserRole.EXECUTOR])
  role!: UserRole.CLIENT | UserRole.EXECUTOR;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  deviceToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  devicePlatform?: string;
}

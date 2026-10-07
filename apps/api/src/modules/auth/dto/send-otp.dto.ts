import { Transform } from 'class-transformer';
import { normalizeAuthPhone } from '../../../shared/validators/phone.validator';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/)
  @Transform(({ value }) => normalizeAuthPhone(value))
  phone!: string;
}

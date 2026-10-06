import {
  Body,
  Controller,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';

import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SendOtpResponseDto } from './dto/send-otp-response.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ApiOperation({ summary: 'Generate and send a one-time password' })
  @ApiOkResponse({ type: SendOtpResponseDto })
  sendOtp(
    @Body() dto: SendOtpDto,
    @Ip() ipAddress: string,
  ): Promise<SendOtpResponseDto> {
    return this.authService.sendOtp(dto.phone, ipAddress);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and issue access/refresh tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtp(
      dto.phone,
      dto.code,
      dto.role,
      dto.deviceToken,
      dto.devicePlatform,
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue new session' })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate current refresh token' })
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(
    @CurrentUser() user: JwtPayload,
  ): Promise<LogoutResponseDto> {
    await this.authService.logout(user);
    return { success: true };
  }
}

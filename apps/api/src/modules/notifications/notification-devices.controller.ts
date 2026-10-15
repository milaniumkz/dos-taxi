import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { NotificationsService } from "./notifications.service";

export class RegisterNotificationDeviceDto {
  @ApiProperty({ maxLength: 512 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string;

  @ApiProperty({ enum: ["web", "android", "ios"] })
  @IsIn(["web", "android", "ios"])
  platform!: string;
}

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications/devices")
export class NotificationDevicesController {
  constructor(private readonly notifications: NotificationsService) {}
  @Post()
  @HttpCode(204)
  @ApiOperation({
    summary:
      "Register or refresh the authenticated user push device without signing in again",
  })
  @ApiNoContentResponse()
  async register(
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterNotificationDeviceDto,
  ): Promise<void> {
    await this.notifications.registerDeviceToken(
      user.sub,
      dto.token,
      dto.platform,
      user.role,
    );
  }
}

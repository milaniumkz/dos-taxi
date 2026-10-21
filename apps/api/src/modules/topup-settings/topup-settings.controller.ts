import { UserRole } from "@dos/shared-types";
import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { TopUpSettingsDto } from "./topup-settings.dto";
import { TopUpSettingsService } from "./topup-settings.service";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/settings/driver-topup")
export class AdminTopUpSettingsController {
  constructor(private readonly settings: TopUpSettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Get driver top-up button settings" })
  @ApiOkResponse({ type: TopUpSettingsDto })
  get(): Promise<TopUpSettingsDto> {
    return this.settings.get();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      "Switch driver top-up between manual requests, Kaspi link and disabled",
  })
  @ApiOkResponse({ type: TopUpSettingsDto })
  update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TopUpSettingsDto,
  ): Promise<TopUpSettingsDto> {
    return this.settings.update(user.sub, dto);
  }
}

@ApiTags("executor")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("executor/topup-settings")
export class ExecutorTopUpSettingsController {
  constructor(private readonly settings: TopUpSettingsService) {}

  @Get()
  @Roles(UserRole.EXECUTOR)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Get fresh driver top-up action before opening payment",
  })
  @ApiOkResponse({ type: TopUpSettingsDto })
  get(): Promise<TopUpSettingsDto> {
    return this.settings.get();
  }
}

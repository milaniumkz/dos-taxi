import {
  Body,
  Controller,
  Delete,
  Get,
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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserEntity } from "./entities/user.entity";
import { UsersService } from "./users.service";

@ApiTags("profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Get current client profile" })
  @ApiOkResponse({ type: UserEntity })
  getProfile(@CurrentUser() user: JwtPayload): Promise<UserEntity> {
    return this.usersService.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: "Update current client profile" })
  @ApiOkResponse({ type: UserEntity })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserEntity> {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Delete()
  @ApiOperation({
    summary: "Delete current account and anonymize personal data",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { deleted: { type: "boolean" } },
    },
  })
  async deleteProfile(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ deleted: boolean }> {
    await this.usersService.deleteProfile(user.sub);
    return { deleted: true };
  }
}

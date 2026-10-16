import { UserRole } from "@dos/shared-types";
import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
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
import { SupportContactsDto } from "./dto/support-contacts.dto";
import { SupportContactsService } from "./support-contacts.service";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/settings/support-contacts")
export class AdminSupportContactsController {
  constructor(private readonly contacts: SupportContactsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "Get support contacts" })
  @ApiOkResponse({ type: SupportContactsDto })
  get(): Promise<SupportContactsDto> {
    return this.contacts.get();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update support contacts" })
  @ApiOkResponse({ type: SupportContactsDto })
  update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SupportContactsDto,
  ): Promise<SupportContactsDto> {
    return this.contacts.update(user.sub, dto);
  }
}

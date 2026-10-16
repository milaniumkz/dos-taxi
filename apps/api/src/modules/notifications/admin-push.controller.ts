import { UserRole } from "@dos/shared-types";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { AdminPushService } from "./admin-push.service";
import { PushCampaignDto } from "./dto/push-campaign.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("admin/push-notifications")
export class AdminPushController {
  constructor(private readonly push: AdminPushService) {}
  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
  @ApiOperation({ summary: "List push campaigns and reachable device counts" })
  list() {
    return this.push.list();
  }
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: "Queue a push notification to passengers, drivers or both",
  })
  send(@CurrentUser() user: JwtPayload, @Body() dto: PushCampaignDto) {
    return this.push.send(user.sub, dto);
  }
}

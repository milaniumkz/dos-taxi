import { UserRole } from "@dos/shared-types";
import { Controller, Get, Header, UseGuards } from "@nestjs/common";
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
import { DriverStatisticsDto } from "./dto/driver-statistics.dto";
import { DriverStatisticsService } from "./driver-statistics.service";

@ApiTags("executor")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EXECUTOR)
@Controller("executor/statistics")
export class DriverStatisticsController {
  constructor(private readonly statistics: DriverStatisticsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary:
      "Get own real completed-order count, passenger rating and completion activity",
  })
  @ApiOkResponse({ type: DriverStatisticsDto })
  get(@CurrentUser() user: JwtPayload): Promise<DriverStatisticsDto> {
    return this.statistics.get(user.sub);
  }
}

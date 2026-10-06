import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import {
  SendSupportMessageDto,
  SupportMessageDto,
} from "./dto/support-message.dto";
import { SupportService } from "./support.service";

@ApiTags("support")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get("messages")
  @ApiOperation({ summary: "List current user's support chat messages" })
  @ApiOkResponse({ type: SupportMessageDto, isArray: true })
  listMessages(@CurrentUser() user: JwtPayload): Promise<SupportMessageDto[]> {
    return this.supportService.listMessages(user.sub);
  }

  @Post("messages")
  @ApiOperation({ summary: "Send support chat message to admin backoffice" })
  @ApiOkResponse({ type: SupportMessageDto })
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendSupportMessageDto,
  ): Promise<SupportMessageDto> {
    return this.supportService.sendMessage(user.sub, dto);
  }
}

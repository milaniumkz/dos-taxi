import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { CreateBalanceTopUpDto } from "./dto/create-balance-top-up.dto";
import { UpdateExecutorProfileDto } from "./dto/update-executor-profile.dto";
import { UpdateExecutorStatusDto } from "./dto/update-executor-status.dto";
import { UploadExecutorDocumentDto } from "./dto/upload-executor-document.dto";
import { ExecutorDocumentEntity } from "./entities/executor-document.entity";
import { ExecutorBalanceTopUpEntity } from "./entities/executor-balance-top-up.entity";
import { ExecutorEntity } from "./entities/executor.entity";
import { DriverBonusesService } from "./driver-bonuses.service";
import { DriverBonusProgressDto } from "./dto/driver-bonus-progress.dto";
import { ExecutorsService } from "./executors.service";

@ApiTags("executor")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("executor")
export class ExecutorsController {
  constructor(
    private readonly executorsService: ExecutorsService,
    private readonly driverBonusesService: DriverBonusesService,
  ) {}

  @Get("bonuses/progress")
  @ApiOperation({
    summary: "Get current driver bonus conditions and completed-order progress",
  })
  @ApiOkResponse({ type: DriverBonusProgressDto })
  getBonusProgress(
    @CurrentUser() user: JwtPayload,
  ): Promise<DriverBonusProgressDto> {
    return this.driverBonusesService.getProgress(user.sub);
  }

  @Get("profile")
  @ApiOperation({ summary: "Get current executor profile" })
  @ApiOkResponse({ type: ExecutorEntity })
  getProfile(@CurrentUser() user: JwtPayload): Promise<ExecutorEntity> {
    return this.executorsService.getProfile(user.sub);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update current executor profile" })
  @ApiOkResponse({ type: ExecutorEntity })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateExecutorProfileDto,
  ): Promise<ExecutorEntity> {
    return this.executorsService.updateProfile(user.sub, dto);
  }

  @Patch("status")
  @ApiOperation({ summary: "Update executor online status and location" })
  @ApiOkResponse({ type: ExecutorEntity })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateExecutorStatusDto,
  ): Promise<ExecutorEntity> {
    return this.executorsService.updateStatus(user.sub, dto);
  }

  @Post("balance-topups")
  @ApiOperation({ summary: "Create executor balance top-up request" })
  @ApiCreatedResponse({ type: ExecutorBalanceTopUpEntity })
  createBalanceTopUp(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBalanceTopUpDto,
  ): Promise<ExecutorBalanceTopUpEntity> {
    return this.executorsService.createBalanceTopUp(user.sub, dto);
  }

  @Post("documents")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload executor verification document" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        documentType: { type: "string" },
        file: { type: "string", format: "binary" },
      },
      required: ["documentType", "file"],
    },
  })
  @ApiCreatedResponse({ type: ExecutorDocumentEntity })
  uploadDocument(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadExecutorDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ExecutorDocumentEntity> {
    return this.executorsService.uploadDocument(user.sub, dto, file);
  }
}

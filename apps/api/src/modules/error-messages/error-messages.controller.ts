import { UserRole } from "@dos/shared-types";
import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ErrorMessagesService } from "./error-messages.service";

export class UpdateErrorMessageDto {
  @ApiProperty({ maxLength: 1000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  ru!: string;

  @ApiProperty({ maxLength: 1000 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  kk!: string;
}

export class ErrorCatalogDto {
  @ApiProperty() version!: string;
  @ApiProperty({
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: { type: "string" },
    },
  })
  messages!: { ru: Record<string, string>; kk: Record<string, string> };
}

@ApiTags("Error messages")
@Controller("config/error-messages")
export class PublicErrorMessagesController {
  constructor(private readonly service: ErrorMessagesService) {}
  @Get()
  @ApiOperation({
    summary: "Get Russian and Kazakh error messages for mobile clients",
  })
  @ApiOkResponse({ type: ErrorCatalogDto })
  get() {
    return this.service.catalog();
  }
}

@ApiTags("Admin error messages")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/error-messages")
export class AdminErrorMessagesController {
  constructor(private readonly service: ErrorMessagesService) {}
  @Get()
  @ApiOperation({ summary: "Get editable error message catalog" })
  @ApiOkResponse({ type: ErrorCatalogDto })
  get() {
    return this.service.catalog();
  }
  @Put(":code")
  @ApiOperation({
    summary: "Replace Russian and Kazakh text for an error code",
  })
  @ApiOkResponse({ type: ErrorCatalogDto })
  update(@Param("code") code: string, @Body() dto: UpdateErrorMessageDto) {
    return this.service.update(code, dto.ru, dto.kk);
  }
}

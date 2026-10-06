import { isUUID } from "class-validator";
import { UserRole } from "@dos/shared-types";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { Roles } from "../../shared/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";
import { OrderResponseDto } from "../orders/dto/order-response.dto";
import { AdminBookingService } from "./admin-booking.service";
import { AdminService } from "./admin.service";
import { CreateAdminOrderDto } from "./dto/create-admin-order.dto";
import { CreateTariffDto } from "./dto/create-tariff.dto";
import { TariffEntity } from "./entities/tariff.entity";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPORT)
@Controller("admin")
export class AdminCreationController {
  constructor(
    private readonly admin: AdminService,
    private readonly bookings: AdminBookingService,
  ) {}

  @Post("orders")
  @ApiOperation({ summary: "Create an order for a client by phone" })
  @ApiHeader({
    name: "X-Idempotency-Key",
    required: true,
    description: "UUID retained when retrying this creation",
  })
  @ApiOkResponse({ type: OrderResponseDto })
  createOrder(
    @CurrentUser() user: JwtPayload,
    @Headers("x-idempotency-key") key: string,
    @Body() dto: CreateAdminOrderDto,
  ) {
    if (!isUUID(key))
      throw new BadRequestException("X-Idempotency-Key must be a UUID");
    return this.bookings.create(user.sub, key, dto);
  }

  @Post("tariffs")
  @ApiHeader({
    name: "X-Idempotency-Key",
    required: true,
    description: "UUID retained when retrying this creation",
  })
  @ApiOperation({
    summary: "Create a city tariff and close the previous version",
  })
  @ApiOkResponse({ type: TariffEntity })
  createTariff(
    @CurrentUser() user: JwtPayload,
    @Headers("x-idempotency-key") key: string,
    @Body() dto: CreateTariffDto,
  ) {
    if (!isUUID(key))
      throw new BadRequestException("X-Idempotency-Key must be a UUID");
    return this.admin.createTariff(user.sub, dto, key);
  }
}

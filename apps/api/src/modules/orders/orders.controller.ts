import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { EstimateResultDto } from "../pricing/dto/estimate-result.dto";

import { CancelOrderDto } from "./dto/cancel-order.dto";
import { CreateOrderDto } from "./dto/create-order.dto";
import { EstimateOrderDto } from "./dto/estimate-order.dto";
import {
  OrderChatMessageDto,
  SendOrderChatMessageDto,
} from "./dto/order-chat-message.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { OrdersHistoryQueryDto } from "./dto/orders-history-query.dto";
import { OrdersHistoryResponseDto } from "./dto/orders-history-response.dto";
import { RateOrderDto } from "./dto/rate-order.dto";
import { OrderChatService } from "./order-chat.service";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderChatService: OrderChatService,
  ) {}

  @Post("estimate")
  @ApiOperation({ summary: "Estimate taxi or delivery order price" })
  @ApiOkResponse({ type: EstimateResultDto })
  estimate(@Body() dto: EstimateOrderDto): Promise<EstimateResultDto> {
    return this.ordersService.estimate(dto);
  }

  @Post()
  @ApiOperation({
    summary: "Create a taxi or delivery order and move it to searching",
  })
  @ApiOkResponse({ type: OrderResponseDto })
  createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(user.sub, dto);
  }

  @Get("active")
  @ApiOperation({ summary: "Get active order for current client" })
  @ApiOkResponse({ type: OrderResponseDto })
  getActiveOrder(
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderResponseDto | null> {
    return this.ordersService.getActiveOrder(user.sub);
  }

  @Get("history")
  @ApiOperation({
    summary: "Get cursor-based order history for current client",
  })
  @ApiOkResponse({ type: OrdersHistoryResponseDto })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: OrdersHistoryQueryDto,
  ): Promise<OrdersHistoryResponseDto> {
    return this.ordersService.getHistory(user.sub, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details for current client" })
  @ApiOkResponse({ type: OrderResponseDto })
  getOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrder(user.sub, orderId);
  }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel an existing order" })
  @ApiOkResponse({ type: OrderResponseDto })
  cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(user.sub, orderId, dto.reason);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "List current client order chat messages" })
  @ApiOkResponse({ type: OrderChatMessageDto, isArray: true })
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
  ): Promise<OrderChatMessageDto[]> {
    return this.orderChatService.listForClient(user.sub, orderId);
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Send current client order chat message" })
  @ApiOkResponse({ type: OrderChatMessageDto })
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: SendOrderChatMessageDto,
  ): Promise<OrderChatMessageDto> {
    return this.orderChatService.sendFromClient(user.sub, orderId, dto);
  }

  @Post(":id/rate")
  @ApiOperation({ summary: "Rate a completed order" })
  @ApiOkResponse({ type: OrderResponseDto })
  rateOrder(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: RateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.rateOrder(
      user.sub,
      orderId,
      dto.executorRating,
      dto.comment,
    );
  }
}

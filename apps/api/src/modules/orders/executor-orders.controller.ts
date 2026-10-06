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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../shared/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { CompleteDeliveryOrderDto } from "./dto/complete-delivery-order.dto";
import { FailDeliveryOrderDto } from "./dto/fail-delivery-order.dto";
import {
  OrderChatMessageDto,
  SendOrderChatMessageDto,
} from "./dto/order-chat-message.dto";
import { OrderResponseDto } from "./dto/order-response.dto";
import { OrdersHistoryQueryDto } from "./dto/orders-history-query.dto";
import { OrdersHistoryResponseDto } from "./dto/orders-history-response.dto";
import { UpdateExecutorOrderStatusDto } from "./dto/update-executor-order-status.dto";
import { OrderChatService } from "./order-chat.service";
import { OrdersService } from "./orders.service";

@ApiTags("executor-orders-status")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("executor/orders")
export class ExecutorOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly orderChatService: OrderChatService,
  ) {}

  @Get("active")
  @ApiOperation({ summary: "Get active order for current executor" })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: "Executor has no active order" })
  getActiveOrder(@CurrentUser() user: JwtPayload): Promise<OrderResponseDto> {
    return this.ordersService.getExecutorActiveOrder(user.sub);
  }

  @Get("history")
  @ApiOperation({
    summary: "Get cursor-based order history for current executor",
  })
  @ApiOkResponse({ type: OrdersHistoryResponseDto })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query() query: OrdersHistoryQueryDto,
  ): Promise<OrdersHistoryResponseDto> {
    return this.ordersService.getExecutorHistory(user.sub, query);
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "List current executor order chat messages" })
  @ApiOkResponse({ type: OrderChatMessageDto, isArray: true })
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
  ): Promise<OrderChatMessageDto[]> {
    return this.orderChatService.listForExecutor(user.sub, orderId);
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Send current executor order chat message" })
  @ApiOkResponse({ type: OrderChatMessageDto })
  sendMessage(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: SendOrderChatMessageDto,
  ): Promise<OrderChatMessageDto> {
    return this.orderChatService.sendFromExecutor(user.sub, orderId, dto);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update active executor order status" })
  @ApiOkResponse({ type: OrderResponseDto })
  updateOrderStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: UpdateExecutorOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateExecutorOrderStatus(user.sub, orderId, dto);
  }

  @Patch(":id/delivery/pickup")
  @ApiOperation({ summary: "Mark delivery order as picked up" })
  @ApiOkResponse({ type: OrderResponseDto })
  pickupDelivery(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.markDeliveryPickedUp(user.sub, orderId);
  }

  @Patch(":id/delivery/at-door")
  @ApiOperation({ summary: "Mark delivery courier as at recipient door" })
  @ApiOkResponse({ type: OrderResponseDto })
  markDeliveryAtDoor(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.markDeliveryAtDoor(user.sub, orderId);
  }

  @Patch(":id/delivery/complete")
  @ApiOperation({ summary: "Complete delivery with proof and recipient code" })
  @ApiOkResponse({ type: OrderResponseDto })
  completeDelivery(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: CompleteDeliveryOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.completeDelivery(user.sub, orderId, dto);
  }

  @Patch(":id/delivery/failed")
  @ApiOperation({ summary: "Mark delivery as failed" })
  @ApiOkResponse({ type: OrderResponseDto })
  failDelivery(
    @CurrentUser() user: JwtPayload,
    @Param("id") orderId: string,
    @Body() dto: FailDeliveryOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.failDelivery(user.sub, orderId, dto.reason);
  }
}

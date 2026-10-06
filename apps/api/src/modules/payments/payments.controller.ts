import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { BindCardDto } from './dto/bind-card.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { PaymentCardResponseDto } from './dto/payment-card-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('methods')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved payment cards for current user' })
  @ApiOkResponse({ type: PaymentCardResponseDto, isArray: true })
  getPaymentMethods(
    @CurrentUser() user: JwtPayload,
  ): Promise<PaymentCardResponseDto[]> {
    return this.paymentsService.getPaymentMethods(user.sub);
  }

  @Post('cards/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bind a new payment card' })
  @ApiOkResponse({ type: PaymentCardResponseDto })
  bindCard(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BindCardDto,
  ): Promise<PaymentCardResponseDto> {
    return this.paymentsService.bindCard(user.sub, dto);
  }

  @Delete('cards/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an existing payment card' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCard(
    @CurrentUser() user: JwtPayload,
    @Param('id') cardId: string,
  ): Promise<void> {
    await this.paymentsService.deleteCard(user.sub, cardId);
  }

  @Post('orders/:id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for an order using a saved card' })
  @ApiOkResponse({ type: PaymentResponseDto })
  payOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') orderId: string,
    @Body() dto: PayOrderDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.payOrder(user.sub, orderId, dto);
  }

  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Handle provider payment webhook' })
  @ApiOkResponse({ type: WebhookResponseDto })
  handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<WebhookResponseDto> {
    return this.paymentsService.handleWebhook(provider, payload);
  }
}

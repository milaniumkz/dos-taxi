import {
  Currency,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
} from '@dos/shared-types';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RedisStoreService } from '../../shared/cache/redis-store.service';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { UserEntity } from '../users/entities/user.entity';

import { BindCardDto } from './dto/bind-card.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { PaymentCardResponseDto } from './dto/payment-card-response.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { WebhookResponseDto } from './dto/webhook-response.dto';
import { PaymentCardEntity } from './entities/payment-card.entity';
import { PaymentEntity } from './entities/payment.entity';
import {
  IPaymentProvider,
  PaymentWebhookResult,
} from './interfaces/payment-provider.interface';
import { DevStubPaymentProvider } from './providers/dev-stub-payment.provider';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentsRepository: Repository<PaymentEntity>,
    @InjectRepository(PaymentCardEntity)
    private readonly paymentCardsRepository: Repository<PaymentCardEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly ordersService: OrdersService,
    private readonly redisStoreService: RedisStoreService,
    private readonly stubPaymentProvider: DevStubPaymentProvider,
  ) {}

  async getPaymentMethods(userId: string): Promise<PaymentCardResponseDto[]> {
    const cards = await this.paymentCardsRepository.find({
      where: { userId, isActive: true },
      order: {
        isDefault: 'DESC',
        createdAt: 'DESC',
      },
    });

    return cards.map((card) => this.toPaymentCardResponse(card));
  }

  async bindCard(
    userId: string,
    dto: BindCardDto,
  ): Promise<PaymentCardResponseDto> {
    await this.ensureUserExists(userId);

    const provider = this.resolveProvider();
    const boundCard = await provider.bindCard({
      userId,
      token: dto.token,
      panMask: dto.panMask,
      holderName: dto.holderName,
      makeDefault: dto.makeDefault,
    });

    if (dto.makeDefault) {
      await this.resetDefaultCards(userId);
    }

    const entity = await this.paymentCardsRepository.save(
      this.paymentCardsRepository.create({
        userId,
        provider: provider.providerName,
        providerCardId: boundCard.providerCardId,
        last4: boundCard.last4,
        brand: boundCard.brand,
        holderName: boundCard.holderName ?? null,
        expMonth: boundCard.expMonth ?? null,
        expYear: boundCard.expYear ?? null,
        isDefault: dto.makeDefault ?? false,
        isActive: true,
      }),
    );

    return this.toPaymentCardResponse(entity);
  }

  async deleteCard(userId: string, cardId: string): Promise<void> {
    const card = await this.paymentCardsRepository.findOne({
      where: { id: cardId, userId, isActive: true },
    });
    if (!card) {
      throw new NotFoundException({
        code: 'PAYMENT_CARD_NOT_FOUND',
        message: 'Payment card not found',
      });
    }

    card.isActive = false;
    card.isDefault = false;
    await this.paymentCardsRepository.save(card);
  }

  async payOrder(
    userId: string,
    orderId: string,
    dto: PayOrderDto,
  ): Promise<PaymentResponseDto> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, clientId: userId },
    });
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    if (order.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException({
        code: 'PAYMENT_METHOD_NOT_CARD',
        message: 'Order payment method is not card',
      });
    }

    const amount = Number(order.finalPrice ?? order.estimatedPrice ?? 0);
    if (amount <= 0) {
      throw new BadRequestException({
        code: 'PAYMENT_AMOUNT_INVALID',
        message: 'Order amount is invalid',
      });
    }

    const existingPayment = await this.paymentsRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existingPayment) {
      if (existingPayment.orderId !== orderId) {
        throw new BadRequestException({
          code: 'PAYMENT_IDEMPOTENCY_CONFLICT',
          message: 'Idempotency key already used for another order',
        });
      }

      return this.toPaymentResponse(existingPayment);
    }

    const boundCard = await this.paymentCardsRepository.findOne({
      where: {
        id: dto.cardId,
        userId,
        isActive: true,
      },
    });
    if (!boundCard) {
      throw new NotFoundException({
        code: 'PAYMENT_CARD_NOT_FOUND',
        message: 'Payment card not found',
      });
    }

    const provider = this.resolveProvider();
    const createdPayment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        orderId: order.id,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.CARD,
        amount: amount.toFixed(2),
        currency: order.currency,
        exchangeRate: this.resolveExchangeRate(order.currency).toFixed(6),
        amountBase: amount.toFixed(2),
        provider: provider.providerName,
        providerTransactionId: null,
        idempotencyKey: dto.idempotencyKey,
        capturedAt: null,
        refundedAmount: '0.00',
      }),
    );

    const paymentResult = await provider.createPayment({
      amount,
      currency: order.currency,
      paymentMethod: PaymentMethod.CARD,
      orderId: order.id,
      cardId: boundCard?.providerCardId ?? null,
      idempotencyKey: dto.idempotencyKey,
    });

    createdPayment.provider = provider.providerName;
    createdPayment.providerTransactionId = paymentResult.transactionId;
    createdPayment.status = paymentResult.status;
    if (paymentResult.status === PaymentStatus.CAPTURED) {
      createdPayment.capturedAt = new Date();
      await this.completeOrderAfterCapture(order);
    }
    await this.paymentsRepository.save(createdPayment);

    return this.toPaymentResponse(createdPayment);
  }

  async refundPayment(
    paymentId: string,
    input: {
      amount?: number;
      reason?: string;
    } = {},
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    if (!payment.provider || !payment.providerTransactionId) {
      throw new BadRequestException({
        code: 'PAYMENT_REFUND_UNAVAILABLE',
        message: 'Payment provider transaction is missing',
      });
    }

    if (
      payment.status !== PaymentStatus.CAPTURED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_REFUND_INVALID_STATUS',
        message: 'Only captured payments can be refunded',
      });
    }

    const totalAmount = Number(payment.amount);
    const refundedAmount = Number(payment.refundedAmount ?? 0);
    const remainingAmount = Number((totalAmount - refundedAmount).toFixed(2));

    if (remainingAmount <= 0) {
      throw new BadRequestException({
        code: 'PAYMENT_ALREADY_REFUNDED',
        message: 'Payment has already been refunded',
      });
    }

    const requestedAmount = Number(
      (input.amount ?? remainingAmount).toFixed(2),
    );

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new BadRequestException({
        code: 'PAYMENT_REFUND_AMOUNT_INVALID',
        message: 'Refund amount is invalid',
      });
    }

    if (requestedAmount > remainingAmount) {
      throw new BadRequestException({
        code: 'PAYMENT_REFUND_AMOUNT_EXCEEDED',
        message: 'Refund amount exceeds remaining captured amount',
      });
    }

    const provider = this.resolveProvider(payment.provider);
    await provider.refundPayment({
      transactionId: payment.providerTransactionId,
      amount: requestedAmount,
      reason: input.reason,
    });

    const nextRefundedAmount = Number(
      (refundedAmount + requestedAmount).toFixed(2),
    );
    payment.refundedAmount = nextRefundedAmount.toFixed(2);
    payment.status =
      nextRefundedAmount >= totalAmount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    await this.paymentsRepository.save(payment);

    return this.toPaymentResponse(payment);
  }

  async cancelPayment(
    paymentId: string,
    input: {
      reason?: string;
    } = {},
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    if (!payment.provider || !payment.providerTransactionId) {
      throw new BadRequestException({
        code: 'PAYMENT_CANCEL_UNAVAILABLE',
        message: 'Payment provider transaction is missing',
      });
    }

    if (payment.status !== PaymentStatus.AUTHORIZED) {
      throw new BadRequestException({
        code: 'PAYMENT_CANCEL_INVALID_STATUS',
        message: 'Only authorized payments can be cancelled',
      });
    }

    const provider = this.resolveProvider(payment.provider);
    await provider.cancelPayment({
      transactionId: payment.providerTransactionId,
      reason: input.reason,
    });

    payment.status = PaymentStatus.CANCELLED;
    await this.paymentsRepository.save(payment);

    return this.toPaymentResponse(payment);
  }

  async handleWebhook(
    providerName: string,
    payload: Record<string, unknown>,
  ): Promise<WebhookResponseDto> {
    const provider = this.resolveProvider(providerName);
    const webhook = await provider.handleWebhook(payload);
    const idempotencyKey = this.getWebhookIdempotencyKey(
      provider.providerName,
      webhook.eventId,
    );

    const alreadyProcessed = await this.redisStoreService.get(idempotencyKey);
    if (alreadyProcessed) {
      return {
        processed: true,
        duplicated: true,
      };
    }

    await this.applyWebhookResult(provider.providerName, webhook);
    await this.redisStoreService.set(idempotencyKey, '1', 60 * 60 * 24 * 7);

    return {
      processed: true,
      duplicated: false,
    };
  }

  private async applyWebhookResult(
    providerName: string,
    webhook: PaymentWebhookResult,
  ): Promise<void> {
    const payment = await this.paymentsRepository.findOne({
      where: {
        provider: providerName,
        providerTransactionId: webhook.transactionId,
      },
    });
    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    payment.status = webhook.status;
    if (webhook.status === PaymentStatus.CAPTURED) {
      payment.capturedAt = payment.capturedAt ?? new Date();
    }
    if (
      webhook.status === PaymentStatus.REFUNDED ||
      webhook.status === PaymentStatus.PARTIALLY_REFUNDED
    ) {
      payment.refundedAmount = (webhook.amount ?? Number(payment.amount)).toFixed(
        2,
      );
    }
    await this.paymentsRepository.save(payment);

    if (webhook.status === PaymentStatus.CAPTURED && payment.orderId) {
      const order = await this.ordersRepository.findOne({
        where: { id: payment.orderId },
      });
      if (order) {
        await this.completeOrderAfterCapture(order);
      }
    }
  }

  private async completeOrderAfterCapture(order: OrderEntity): Promise<void> {
    let currentStatus = order.status;
    if (currentStatus === OrderStatus.COMPLETED) {
      return;
    }

    if (order.serviceType === ServiceType.DELIVERY) {
      if (currentStatus === OrderStatus.IN_PROGRESS) {
        await this.ordersService.transition(
          order.id,
          OrderStatus.DELIVERED,
          'system:payment_capture',
          { source: 'payment_capture' },
        );
        currentStatus = OrderStatus.DELIVERED;
      }
      if (currentStatus === OrderStatus.DELIVERED) {
        await this.ordersService.transition(
          order.id,
          OrderStatus.COMPLETED,
          'system:payment_capture',
          { source: 'payment_capture' },
        );
      }
      return;
    }

    if (currentStatus === OrderStatus.WAITING) {
      await this.ordersService.transition(
        order.id,
        OrderStatus.IN_PROGRESS,
        'system:payment_capture',
        { source: 'payment_capture' },
      );
      currentStatus = OrderStatus.IN_PROGRESS;
    }

    if (currentStatus === OrderStatus.IN_PROGRESS) {
      await this.ordersService.transition(
        order.id,
        OrderStatus.COMPLETED,
        'system:payment_capture',
        { source: 'payment_capture' },
      );
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }
  }

  private async resetDefaultCards(userId: string): Promise<void> {
    const currentDefaultCards = await this.paymentCardsRepository.find({
      where: { userId, isActive: true, isDefault: true },
    });
    if (currentDefaultCards.length === 0) {
      return;
    }

    for (const card of currentDefaultCards) {
      card.isDefault = false;
      await this.paymentCardsRepository.save(card);
    }
  }

  private resolveProvider(providerName = 'stub'): IPaymentProvider {
    if (providerName === 'stub') {
      return this.stubPaymentProvider;
    }

    throw new BadRequestException({
      code: 'PAYMENT_PROVIDER_UNSUPPORTED',
      message: `Unsupported payment provider ${providerName}`,
    });
  }

  private resolveExchangeRate(currency: Currency): number {
    return currency === Currency.KZT || currency === Currency.RUB ? 1 : 1;
  }

  private getWebhookIdempotencyKey(
    providerName: string,
    eventId: string,
  ): string {
    return `payments:webhook:${providerName}:${eventId}`;
  }

  private toPaymentCardResponse(
    card: PaymentCardEntity,
  ): PaymentCardResponseDto {
    return {
      id: card.id,
      provider: card.provider,
      last4: card.last4,
      brand: card.brand,
      holderName: card.holderName,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: card.isDefault,
    };
  }

  private toPaymentResponse(payment: PaymentEntity): PaymentResponseDto {
    return {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      orderId: payment.orderId,
      capturedAt: payment.capturedAt,
      refundedAmount: payment.refundedAmount,
      idempotencyKey: payment.idempotencyKey,
    };
  }
}

import {
  Currency,
  PaymentStatus,
} from '@dos/shared-types';
import { Injectable } from '@nestjs/common';

import {
  BindCardInput,
  CancelPaymentInput,
  ConfirmPaymentInput,
  CreatePaymentInput,
  CreatePaymentResult,
  IPaymentProvider,
  PaymentProviderCard,
  PaymentWebhookResult,
  PaymentPayoutInput,
  RefundPaymentInput,
} from '../interfaces/payment-provider.interface';

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

@Injectable()
export class DevStubPaymentProvider implements IPaymentProvider {
  readonly providerName = 'stub';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    await wait(500);
    return {
      transactionId: `stub_txn_${input.orderId}_${Date.now()}`,
      status: PaymentStatus.CAPTURED,
      amount: input.amount,
      currency: input.currency,
      metadata: {
        provider: this.providerName,
      },
    };
  }

  async confirmPayment(
    input: ConfirmPaymentInput,
  ): Promise<CreatePaymentResult> {
    await wait(500);
    return {
      transactionId: input.transactionId,
      status: PaymentStatus.CAPTURED,
      amount: input.amount ?? 0,
      currency: Currency.KZT,
    };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<PaymentStatus> {
    void input;
    await wait(500);
    return PaymentStatus.CANCELLED;
  }

  async refundPayment(input: RefundPaymentInput): Promise<PaymentStatus> {
    void input;
    await wait(500);
    return PaymentStatus.REFUNDED;
  }

  async bindCard(input: BindCardInput): Promise<PaymentProviderCard> {
    await wait(500);
    const last4 = this.resolveLast4(input.panMask, input.token);
    return {
      providerCardId: `stub_card_${input.userId}_${Date.now()}`,
      last4,
      brand: 'VISA',
      holderName: input.holderName?.trim() || null,
      expMonth: 12,
      expYear: 2030,
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    void transactionId;
    await wait(500);
    return PaymentStatus.CAPTURED;
  }

  async createPayout(
    input: PaymentPayoutInput,
  ): Promise<{ payoutId: string }> {
    await wait(500);
    return {
      payoutId: `stub_payout_${input.executorId}_${Date.now()}`,
    };
  }

  async handleWebhook(
    payload: Record<string, unknown>,
  ): Promise<PaymentWebhookResult> {
    await wait(500);

    return {
      eventId:
        this.readString(payload.eventId) ??
        this.readString(payload.id) ??
        `stub_event_${Date.now()}`,
      transactionId:
        this.readString(payload.transactionId) ??
        this.readString(payload.paymentId) ??
        this.readString(payload.providerTransactionId) ??
        'stub_txn_unknown',
      orderId: this.readString(payload.orderId),
      status: this.resolveStatus(payload.status),
      amount:
        typeof payload.amount === 'number'
          ? payload.amount
          : Number(payload.amount ?? 0),
      metadata: payload,
    };
  }

  private resolveLast4(panMask?: string, token?: string): string {
    const normalized = (panMask ?? token ?? '0000').replace(/\D/g, '');
    return normalized.slice(-4).padStart(4, '0');
  }

  private readString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private resolveStatus(value: unknown): PaymentStatus {
    switch (value) {
      case PaymentStatus.AUTHORIZED:
      case PaymentStatus.CANCELLED:
      case PaymentStatus.REFUNDED:
      case PaymentStatus.PARTIALLY_REFUNDED:
      case PaymentStatus.FAILED:
      case PaymentStatus.CAPTURED:
        return value;
      default:
        return PaymentStatus.CAPTURED;
    }
  }
}

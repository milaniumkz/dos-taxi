import {
  Currency,
  PaymentMethod,
  PaymentStatus,
} from '@dos/shared-types';

export type PaymentProviderCard = {
  providerCardId: string;
  last4: string;
  brand: string;
  holderName?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
};

export type CreatePaymentInput = {
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  orderId: string;
  cardId?: string | null;
  idempotencyKey: string;
};

export type CreatePaymentResult = {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: Currency;
  metadata?: Record<string, unknown>;
};

export type ConfirmPaymentInput = {
  transactionId: string;
  amount?: number;
};

export type CancelPaymentInput = {
  transactionId: string;
  reason?: string;
};

export type RefundPaymentInput = {
  transactionId: string;
  amount: number;
  reason?: string;
};

export type BindCardInput = {
  userId: string;
  token?: string;
  holderName?: string;
  panMask?: string;
  makeDefault?: boolean;
};

export type PaymentWebhookResult = {
  eventId: string;
  transactionId: string;
  orderId?: string;
  status: PaymentStatus;
  amount?: number;
  metadata?: Record<string, unknown>;
};

export type PaymentPayoutInput = {
  executorId: string;
  amount: number;
  currency: Currency;
};

export interface IPaymentProvider {
  readonly providerName: string;

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  confirmPayment(input: ConfirmPaymentInput): Promise<CreatePaymentResult>;
  cancelPayment(input: CancelPaymentInput): Promise<PaymentStatus>;
  refundPayment(input: RefundPaymentInput): Promise<PaymentStatus>;
  bindCard(input: BindCardInput): Promise<PaymentProviderCard>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  createPayout(input: PaymentPayoutInput): Promise<{ payoutId: string }>;
  handleWebhook(payload: Record<string, unknown>): Promise<PaymentWebhookResult>;
}

import {
  CourierVehicleType,
  Currency,
  DeliveryStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
  UserRole,
} from '@dos/shared-types';
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';

import { AdminController } from '../../../src/modules/admin/admin.controller';
import { AdminService } from '../../../src/modules/admin/admin.service';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthResponseDto } from '../../../src/modules/auth/dto/auth-response.dto';
import { SendOtpResponseDto } from '../../../src/modules/auth/dto/send-otp-response.dto';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/modules/auth/guards/roles.guard';
import { JwtPayload } from '../../../src/modules/auth/interfaces/jwt-payload.interface';
import { DispatchController } from '../../../src/modules/dispatch/dispatch.controller';
import { DispatchService } from '../../../src/modules/dispatch/dispatch.service';
import { IncomingDispatchOfferDto } from '../../../src/modules/dispatch/dto/incoming-dispatch-offer.dto';
import { CompleteDeliveryOrderDto } from '../../../src/modules/orders/dto/complete-delivery-order.dto';
import { CreateOrderDto } from '../../../src/modules/orders/dto/create-order.dto';
import { EstimateOrderDto } from '../../../src/modules/orders/dto/estimate-order.dto';
import { OrderResponseDto } from '../../../src/modules/orders/dto/order-response.dto';
import { UpdateExecutorOrderStatusDto } from '../../../src/modules/orders/dto/update-executor-order-status.dto';
import { ExecutorOrdersController } from '../../../src/modules/orders/executor-orders.controller';
import { OrdersController } from '../../../src/modules/orders/orders.controller';
import { OrdersService } from '../../../src/modules/orders/orders.service';
import { BindCardDto } from '../../../src/modules/payments/dto/bind-card.dto';
import { PayOrderDto } from '../../../src/modules/payments/dto/pay-order.dto';
import { PaymentCardResponseDto } from '../../../src/modules/payments/dto/payment-card-response.dto';
import { PaymentResponseDto } from '../../../src/modules/payments/dto/payment-response.dto';
import { PaymentsController } from '../../../src/modules/payments/payments.controller';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { configureHttpApplication } from '../../../src/shared/http/configure-http-app';

export const TEST_CITY_ID = '00000000-0000-4000-8000-000000000001';

type OtpRecord = {
  code: string;
  failedAttempts: number;
  locked: boolean;
};

type StoredRoutePoint = {
  id: string;
  sequenceIndex: number;
  lat: number;
  lng: number;
  address: string;
  contactName?: string;
  contactPhone?: string;
  arrivedAt: Date | null;
  completedAt: Date | null;
  notes?: string;
};

type StoredDeliveryDetails = NonNullable<OrderResponseDto['deliveryDetails']> & {
  proofSignatureUrl: string | null;
  updatedAt: Date;
};

type StoredOrder = Omit<OrderResponseDto, 'routePoints' | 'deliveryDetails'> & {
  clientId: string;
  discountAmount: string;
  clientRating: number | null;
  updatedAt: Date;
  routePoints: StoredRoutePoint[];
  deliveryDetails?: StoredDeliveryDetails;
};

type StoredPayment = PaymentResponseDto & {
  userId: string;
  refundedAmount: string;
  createdAt: Date;
};

export type SentNotification = {
  userId: string;
  type: string;
  orderId: string;
  payload: Record<string, unknown>;
};

export type RealtimeLocationEvent = {
  type: 'order:executor_location';
  orderId: string;
  lat: number;
  lng: number;
  heading: number | null;
};

export type E2EHarness = {
  app: INestApplication;
  authService: E2EAuthServiceDouble;
  ordersService: E2EOrdersServiceDouble;
  dispatchService: E2EDispatchServiceDouble;
  paymentsService: E2EPaymentsServiceDouble;
  adminService: E2EAdminServiceDouble;
  close: () => Promise<void>;
};

function makeUuid(seed: number): string {
  return `00000000-0000-4000-8000-${seed.toString().padStart(12, '0')}`;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function estimateAmount(dto: {
  serviceType: ServiceType;
  distanceMeters: number;
  durationSeconds: number;
  courierVehicleType?: CourierVehicleType;
  isFragile?: boolean;
  requiresReturn?: boolean;
}): number {
  const distanceKm = dto.distanceMeters / 1000;
  const durationMinutes = dto.durationSeconds / 60;
  const taxiAmount = Math.max(
    1200,
    500 + distanceKm * 110 + durationMinutes * 35,
  );

  if (dto.serviceType === ServiceType.TAXI) {
    return taxiAmount;
  }

  const vehicleSurcharge: Record<CourierVehicleType, number> = {
    [CourierVehicleType.BICYCLE]: 200,
    [CourierVehicleType.MOPED]: 350,
    [CourierVehicleType.SCOOTER]: 250,
    [CourierVehicleType.CAR]: 500,
  };

  let amount = 900 + distanceKm * 90 + durationMinutes * 20;
  if (dto.courierVehicleType) {
    amount += vehicleSurcharge[dto.courierVehicleType];
  }
  if (dto.isFragile) {
    amount += 180;
  }
  if (dto.requiresReturn) {
    amount += 300;
  }

  return amount;
}

@Injectable()
class AllowThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

export class E2EAuthServiceDouble {
  private readonly otpRecords = new Map<string, OtpRecord>();
  private readonly accessSessions = new Map<string, JwtPayload>();
  private readonly refreshSessions = new Map<string, JwtPayload>();
  private readonly userIds = new Map<string, string>();
  private tokenSequence = 1;
  private userSequence = 10;

  async sendOtp(phone: string): Promise<SendOtpResponseDto> {
    this.otpRecords.set(phone, {
      code: '1234',
      failedAttempts: 0,
      locked: false,
    });

    return {
      expiresInSeconds: 300,
      devCode: '1234',
    };
  }

  async verifyOtp(
    phone: string,
    code: string,
    role: UserRole.CLIENT | UserRole.EXECUTOR,
  ): Promise<AuthResponseDto> {
    const record = this.otpRecords.get(phone) ?? {
      code: '1234',
      failedAttempts: 0,
      locked: false,
    };
    this.otpRecords.set(phone, record);

    if (record.locked) {
      throw new HttpException({
        code: 'OTP_LOCKED',
        message: 'OTP verification is temporarily locked',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (code !== record.code) {
      record.failedAttempts += 1;
      if (record.failedAttempts >= 3) {
        record.locked = true;
        throw new HttpException({
          code: 'OTP_LOCKED',
          message: 'OTP verification is temporarily locked',
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      throw new UnauthorizedException({
        code: 'OTP_INVALID',
        message: 'OTP code is invalid',
      });
    }

    record.failedAttempts = 0;

    const payload: JwtPayload = {
      sub: this.resolveUserId(phone, role),
      phone,
      role,
    };

    return this.issueSession(payload);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = this.refreshSessions.get(refreshToken);
    if (!payload) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token is invalid',
      });
    }

    this.refreshSessions.delete(refreshToken);
    return this.issueSession(payload);
  }

  async logout(user: JwtPayload): Promise<void> {
    for (const [refreshToken, payload] of this.refreshSessions.entries()) {
      if (payload.sub === user.sub) {
        this.refreshSessions.delete(refreshToken);
      }
    }
  }

  getPayloadByAccessToken(accessToken: string): JwtPayload | null {
    return this.accessSessions.get(accessToken) ?? null;
  }

  createSessionForRole(phone: string, role: UserRole): AuthResponseDto {
    const payload: JwtPayload = {
      sub: this.resolveUserId(phone, role),
      phone,
      role,
    };
    return this.issueSession(payload);
  }

  private issueSession(payload: JwtPayload): AuthResponseDto {
    const accessToken = `access-token-${this.tokenSequence++}`;
    const refreshToken = `refresh-token-${this.tokenSequence++}`;

    this.accessSessions.set(accessToken, payload);
    this.refreshSessions.set(refreshToken, payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: payload.sub,
        phone: payload.phone,
        name: null,
        preferredLanguage: 'ru',
        preferredCurrency: Currency.KZT,
      },
    };
  }

  private resolveUserId(
    phone: string,
    role: UserRole,
  ): string {
    const key = `${phone}:${role}`;
    const existing = this.userIds.get(key);
    if (existing) {
      return existing;
    }

    const created = makeUuid(this.userSequence++);
    this.userIds.set(key, created);
    return created;
  }
}

@Injectable()
class E2EJwtAuthGuard implements CanActivate {
  constructor(private readonly authService: E2EAuthServiceDouble) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: JwtPayload;
    }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: 'Authorization header is required',
      });
    }

    const payload = this.authService.getPayloadByAccessToken(token);
    if (!payload) {
      throw new UnauthorizedException({
        code: 'ACCESS_TOKEN_INVALID',
        message: 'Access token is invalid',
      });
    }

    request.user = payload;
    return true;
  }
}

export class E2EOrdersServiceDouble {
  private readonly orders = new Map<string, StoredOrder>();
  private orderSequence = 100;
  private paymentsService: E2EPaymentsServiceDouble | null = null;
  private taxiTariff = {
    basePrice: 500,
    pricePerKm: 110,
    pricePerMinute: 35,
    minimumPrice: 1200,
  };

  readonly notifications: SentNotification[] = [];
  readonly realtimeEvents: RealtimeLocationEvent[] = [];

  attachPaymentsService(paymentsService: E2EPaymentsServiceDouble): void {
    this.paymentsService = paymentsService;
  }

  async estimate(dto: EstimateOrderDto) {
    const amount =
      dto.serviceType === ServiceType.TAXI
        ? this.estimateTaxi(dto.distanceMeters, dto.durationSeconds)
        : estimateAmount({
            serviceType: dto.serviceType,
            distanceMeters: dto.distanceMeters,
            durationSeconds: dto.durationSeconds,
            courierVehicleType: dto.courierVehicleType,
            isFragile: dto.isFragile,
            requiresReturn: dto.requiresReturn,
          });

    return {
      estimatedPrice: formatAmount(amount),
      currency: Currency.KZT,
      distanceMeters: dto.distanceMeters,
      durationSeconds: dto.durationSeconds,
      surgeCoefficient: 1,
      nightCoefficient: 1,
      breakdown: [],
    };
  }

  async createOrder(clientId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
    const distanceMeters = dto.distanceMeters ?? 5400;
    const durationSeconds = dto.durationSeconds ?? 960;
    const amount =
      dto.serviceType === ServiceType.TAXI
        ? this.estimateTaxi(distanceMeters, durationSeconds)
        : estimateAmount({
            serviceType: dto.serviceType,
            distanceMeters,
            durationSeconds,
            courierVehicleType: dto.courierVehicleType,
            isFragile: dto.isFragile,
            requiresReturn: dto.requiresReturn,
          });

    const orderId = makeUuid(this.orderSequence++);
    const isDelivery = dto.serviceType === ServiceType.DELIVERY;
    const order: StoredOrder = {
      id: orderId,
      clientId,
      serviceType: dto.serviceType,
      status: OrderStatus.SEARCHING,
      cityId: dto.cityId ?? TEST_CITY_ID,
      currency: Currency.KZT,
      paymentMethod: dto.paymentMethod,
      promoCodeId: null,
      executorId: null,
      estimatedPrice: formatAmount(amount),
      finalPrice: null,
      distanceMeters,
      durationSeconds,
      carClass: dto.carClass ?? null,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      discountAmount: '0.00',
      clientRating: null,
      executorRating: null,
      routePoints: dto.routePoints.map((point, index) => ({
        id: makeUuid(this.orderSequence * 10 + index),
        sequenceIndex: point.sequenceIndex,
        lat: point.lat,
        lng: point.lng,
        address: point.address,
        contactName: point.contactName,
        contactPhone: point.contactPhone,
        arrivedAt: null,
        completedAt: null,
        notes: point.notes,
      })),
      deliveryDetails: isDelivery
        ? {
            courierVehicleType: dto.courierVehicleType!,
            packageDescription: dto.packageDescription ?? null,
            packagePhotoUrl: dto.packagePhoto ?? null,
            declaredValue:
              dto.declaredValue !== undefined
                ? formatAmount(dto.declaredValue)
                : null,
            isFragile: dto.isFragile ?? false,
            requiresReturn: dto.requiresReturn ?? false,
            cashOnDelivery:
              dto.cashOnDelivery !== undefined
                ? formatAmount(dto.cashOnDelivery)
                : null,
            deliveryStatus: DeliveryStatus.PENDING_PICKUP,
            proofPhotoUrl: null,
            proofSignatureUrl: null,
            recipientCode: dto.recipientCode ?? null,
            updatedAt: new Date('2025-01-01T00:00:00Z'),
          }
        : undefined,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    };

    this.orders.set(orderId, order);
    return order;
  }

  async getHistory(clientId: string) {
    return {
      items: [...this.orders.values()].filter((order) => order.clientId === clientId),
      nextCursor: null,
    };
  }

  async getExecutorHistory(executorUserId: string) {
    return {
      items: [...this.orders.values()].filter(
        (order) => order.executorId === executorUserId,
      ),
      nextCursor: null,
    };
  }

  async getExecutorActiveOrder(
    executorUserId: string,
  ): Promise<OrderResponseDto> {
    const activeOrder = [...this.orders.values()].find(
      (order) =>
        order.executorId === executorUserId &&
        [
          OrderStatus.ACCEPTED,
          OrderStatus.ARRIVING,
          OrderStatus.WAITING,
          OrderStatus.IN_PROGRESS,
          OrderStatus.DELIVERED,
        ].includes(order.status),
    );

    if (!activeOrder) {
      throw new NotFoundException({
        code: 'EXECUTOR_ACTIVE_ORDER_NOT_FOUND',
        message: 'Executor has no active order',
      });
    }

    return activeOrder;
  }

  async getOrder(clientId: string, orderId: string): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    if (order.clientId !== clientId) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    return order;
  }

  async cancelOrder(
    clientId: string,
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrder(clientId, orderId);
    order.status = OrderStatus.CANCELLED_CLIENT;
    order.cancelReason = reason ?? null;
    order.cancelledAt = new Date('2025-01-01T04:00:00Z');
    this.paymentsService?.partialRefundOrder(orderId);
    return order;
  }

  async rateOrder(
    clientId: string,
    orderId: string,
    executorRating: number,
  ): Promise<OrderResponseDto> {
    const order = await this.getOrder(clientId, orderId);
    order.executorRating = executorRating;
    return order;
  }

  async updateExecutorOrderStatus(
    executorUserId: string,
    orderId: string,
    dto: UpdateExecutorOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = dto.status;

    if (dto.status === OrderStatus.IN_PROGRESS) {
      order.startedAt = new Date('2025-01-01T02:00:00Z');
    }

    if (dto.status === OrderStatus.COMPLETED) {
      order.completedAt = new Date('2025-01-01T03:00:00Z');
      order.finalPrice = order.estimatedPrice;
      this.paymentsService?.captureOrder(orderId);
    }

    if (dto.lat !== undefined && dto.lng !== undefined) {
      this.realtimeEvents.push({
        type: 'order:executor_location',
        orderId,
        lat: dto.lat,
        lng: dto.lng,
        heading: dto.heading ?? null,
      });
    }

    return order;
  }

  async markDeliveryPickedUp(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = OrderStatus.IN_PROGRESS;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.PICKED_UP;
    }
    return order;
  }

  async markDeliveryAtDoor(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.AT_DOOR;
    }
    return order;
  }

  async completeDelivery(
    executorUserId: string,
    orderId: string,
    dto: CompleteDeliveryOrderDto,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date('2025-01-01T03:30:00Z');
    order.finalPrice = order.estimatedPrice;

    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERED_CONFIRMED;
      order.deliveryDetails.proofPhotoUrl = dto.proofPhoto ?? null;
      order.deliveryDetails.recipientCode =
        dto.recipientCode ?? order.deliveryDetails.recipientCode ?? null;
    }

    this.notifications.push({
      userId: order.clientId,
      type: 'delivery_completed',
      orderId,
      payload: {
        recipientCode: dto.recipientCode ?? null,
      },
    });
    this.paymentsService?.captureOrder(orderId);

    return order;
  }

  async failDelivery(
    executorUserId: string,
    orderId: string,
    reason?: string,
  ): Promise<OrderResponseDto> {
    const order = this.getById(orderId);
    order.executorId = order.executorId ?? executorUserId;
    order.status = OrderStatus.FAILED;
    order.cancelReason = reason ?? null;
    if (order.deliveryDetails) {
      order.deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERY_FAILED;
    }
    return order;
  }

  getById(orderId: string): StoredOrder {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    return order;
  }

  listSearchingOrders(): StoredOrder[] {
    return [...this.orders.values()].filter(
      (order) => order.status === OrderStatus.SEARCHING,
    );
  }

  updateTaxiTariff(config: {
    basePrice?: number;
    pricePerKm?: number;
    pricePerMinute?: number;
    minimumPrice?: number;
  }): void {
    this.taxiTariff = {
      ...this.taxiTariff,
      ...config,
    };
  }

  getOrdersSnapshot(): StoredOrder[] {
    return [...this.orders.values()];
  }

  private estimateTaxi(distanceMeters: number, durationSeconds: number): number {
    const distanceKm = distanceMeters / 1000;
    const durationMinutes = durationSeconds / 60;

    return Math.max(
      this.taxiTariff.minimumPrice,
      this.taxiTariff.basePrice +
        distanceKm * this.taxiTariff.pricePerKm +
        durationMinutes * this.taxiTariff.pricePerMinute,
    );
  }
}

export class E2EDispatchServiceDouble {
  private readonly blockedExecutorIds = new Set<string>();

  constructor(private readonly ordersService: E2EOrdersServiceDouble) {}

  async getIncomingOffers(executorUserId: string): Promise<IncomingDispatchOfferDto[]> {
    if (this.blockedExecutorIds.has(executorUserId)) {
      return [];
    }

    return this.ordersService
      .listSearchingOrders()
      .map((order) => ({
        orderId: order.id,
        serviceType: order.serviceType,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        clientName: null,
        clientPhone: null,
        estimatedPrice: order.estimatedPrice,
        distanceMeters: order.distanceMeters,
        durationSeconds: order.durationSeconds,
        pickupAddress: order.routePoints[0]?.address ?? null,
        pickupLat: order.routePoints[0]?.lat ?? null,
        pickupLng: order.routePoints[0]?.lng ?? null,
        destinationAddress: order.routePoints.at(-1)?.address ?? null,
        destinationLat: order.routePoints.at(-1)?.lat ?? null,
        destinationLng: order.routePoints.at(-1)?.lng ?? null,
        offeredAt: new Date('2025-01-01T00:10:00Z'),
      }));
  }

  async acceptOrder(
    executorUserId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    if (this.blockedExecutorIds.has(executorUserId)) {
      throw new UnauthorizedException({
        code: 'EXECUTOR_BLOCKED',
        message: 'Executor is blocked',
      });
    }

    const order = this.ordersService.getById(orderId);
    order.executorId = executorUserId;
    order.status = OrderStatus.ACCEPTED;
    order.acceptedAt = new Date('2025-01-01T01:00:00Z');
    this.ordersService.notifications.push({
      userId: order.clientId,
      type: 'order_accepted',
      orderId,
      payload: {
        executorId: executorUserId,
      },
    });
    return order;
  }

  async rejectOrder(_: string, orderId: string): Promise<void> {
    const order = this.ordersService.getById(orderId);
    if (order.status !== OrderStatus.SEARCHING) {
      throw new BadRequestException({
        code: 'ORDER_NOT_SEARCHING',
        message: 'Order is not awaiting executor',
      });
    }
  }

  setExecutorBlocked(executorUserId: string, isBlocked: boolean): void {
    if (isBlocked) {
      this.blockedExecutorIds.add(executorUserId);
      return;
    }

    this.blockedExecutorIds.delete(executorUserId);
  }
}

export class E2EPaymentsServiceDouble {
  private readonly cardsByUser = new Map<string, PaymentCardResponseDto[]>();
  private readonly paymentsByOrder = new Map<string, StoredPayment>();
  private cardSequence = 1000;
  private paymentSequence = 2000;

  constructor(private readonly ordersService: E2EOrdersServiceDouble) {}

  async getPaymentMethods(userId: string): Promise<PaymentCardResponseDto[]> {
    return [...(this.cardsByUser.get(userId) ?? [])];
  }

  async bindCard(
    userId: string,
    dto: BindCardDto,
  ): Promise<PaymentCardResponseDto> {
    const cards = this.cardsByUser.get(userId) ?? [];
    if (dto.makeDefault) {
      for (const card of cards) {
        card.isDefault = false;
      }
    }

    const panMask = dto.panMask ?? '4000 00** **** 2458';
    const digits = panMask.replace(/\D/g, '');
    const card: PaymentCardResponseDto = {
      id: makeUuid(this.cardSequence++),
      provider: 'stub',
      last4: digits.slice(-4) || '2458',
      brand: 'VISA',
      holderName: dto.holderName ?? null,
      expMonth: 12,
      expYear: 2030,
      isDefault: dto.makeDefault ?? cards.length === 0,
    };

    cards.push(card);
    this.cardsByUser.set(userId, cards);
    return card;
  }

  async deleteCard(userId: string, cardId: string): Promise<void> {
    const cards = this.cardsByUser.get(userId) ?? [];
    this.cardsByUser.set(
      userId,
      cards.filter((card) => card.id !== cardId),
    );
  }

  async payOrder(
    userId: string,
    orderId: string,
    dto: PayOrderDto,
  ): Promise<PaymentResponseDto> {
    const order = await this.ordersService.getOrder(userId, orderId);
    const card = (this.cardsByUser.get(userId) ?? []).find(
      (entry) => entry.id === dto.cardId,
    );
    if (!card) {
      throw new NotFoundException({
        code: 'CARD_NOT_FOUND',
        message: 'Payment card not found',
      });
    }

    const existing = this.paymentsByOrder.get(orderId);
    if (existing && existing.idempotencyKey === dto.idempotencyKey) {
      return existing;
    }

    const payment: StoredPayment = {
      id: makeUuid(this.paymentSequence++),
      status: PaymentStatus.AUTHORIZED,
      method: PaymentMethod.CARD,
      amount: order.estimatedPrice ?? '0.00',
      currency: order.currency,
      provider: 'stub',
      providerTransactionId: `txn-${this.paymentSequence}`,
      orderId,
      capturedAt: null,
      idempotencyKey: dto.idempotencyKey,
      userId,
      refundedAmount: '0.00',
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    this.paymentsByOrder.set(orderId, payment);
    return payment;
  }

  async handleWebhook(
    provider: string,
    payload: Record<string, unknown>,
  ): Promise<{ processed: boolean; duplicated: boolean }> {
    const orderId = String(payload.orderId ?? '');
    const status = String(payload.status ?? '');

    if (provider !== 'stub') {
      throw new BadRequestException({
        code: 'PAYMENT_PROVIDER_UNSUPPORTED',
        message: 'Unsupported payment provider',
      });
    }

    if (status === PaymentStatus.CAPTURED && orderId) {
      this.captureOrder(orderId);
    }

    if (status === PaymentStatus.PARTIALLY_REFUNDED && orderId) {
      this.partialRefundOrder(orderId, String(payload.refundedAmount ?? '250.00'));
    }

    return {
      processed: true,
      duplicated: false,
    };
  }

  captureOrder(orderId: string): void {
    const payment = this.paymentsByOrder.get(orderId);
    if (!payment || payment.status === PaymentStatus.CAPTURED) {
      return;
    }

    payment.status = PaymentStatus.CAPTURED;
    payment.capturedAt = new Date('2025-01-01T04:00:00Z');
  }

  partialRefundOrder(orderId: string, refundedAmount = '250.00'): void {
    const payment = this.paymentsByOrder.get(orderId);
    if (!payment) {
      return;
    }

    payment.status = PaymentStatus.PARTIALLY_REFUNDED;
    payment.refundedAmount = refundedAmount;
  }

  getPaymentByOrder(orderId: string): StoredPayment | null {
    return this.paymentsByOrder.get(orderId) ?? null;
  }

  getAllPayments(): StoredPayment[] {
    return [...this.paymentsByOrder.values()];
  }
}

export class E2EAdminServiceDouble {
  private readonly tariffs = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly ordersService: E2EOrdersServiceDouble,
    private readonly dispatchService: E2EDispatchServiceDouble,
    private readonly paymentsService: E2EPaymentsServiceDouble,
  ) {}

  async listCities() {
    return [];
  }

  async createCity(dto: Record<string, unknown>) {
    return {
      id: TEST_CITY_ID,
      ...dto,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };
  }

  async updateCity(cityId: string, dto: Record<string, unknown>) {
    return {
      id: cityId,
      ...dto,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };
  }

  async listTariffs() {
    return [...this.tariffs.values()];
  }

  async listUsers() {
    return [];
  }

  async listExecutors() {
    return [];
  }

  async getOrderDetail(orderId: string) {
    const order = this.ordersService
      .getOrdersSnapshot()
      .find((item) => item.id === orderId);

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    const payment = this.paymentsService.getPaymentByOrder(orderId);

    return {
      id: order.id,
      serviceType: order.serviceType,
      status: order.status,
      clientId: order.clientId,
      executorId: order.executorId,
      cityId: order.cityId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      estimatedPrice: order.estimatedPrice,
      finalPrice: order.finalPrice,
      pickupAddress: order.routePoints[0]?.address ?? null,
      destinationAddress: order.routePoints.at(-1)?.address ?? null,
      deliveryStatus: order.deliveryDetails?.deliveryStatus ?? null,
      createdAt: order.createdAt,
      scheduledAt: order.scheduledAt,
      client: null,
      executor: order.executorId
        ? {
            id: order.executorId,
            userId: order.executorId,
            name: null,
            phone: '',
            email: null,
            isBlocked: false,
            executorType: 'driver',
            vehicleType: null,
            carClass: null,
            isOnline: true,
            verificationStatus: 'verified',
          }
        : null,
      city: {
        id: order.cityId,
        nameRu: 'Алматы',
        nameKk: 'Алматы',
        currency: order.currency,
      },
      distanceMeters: order.distanceMeters,
      durationSeconds: order.durationSeconds,
      discountAmount: order.discountAmount,
      acceptedAt: order.acceptedAt,
      startedAt: order.startedAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      clientRating: order.clientRating,
      executorRating: order.executorRating,
      updatedAt: order.updatedAt,
      routePoints: order.routePoints.map((point) => ({
        id: point.id,
        sequenceIndex: point.sequenceIndex,
        lat: point.lat,
        lng: point.lng,
        address: point.address,
        contactName: point.contactName ?? null,
        contactPhone: point.contactPhone ?? null,
        arrivedAt: point.arrivedAt ?? null,
        completedAt: point.completedAt ?? null,
        notes: point.notes ?? null,
      })),
      delivery: order.deliveryDetails
        ? {
            courierVehicleType: order.deliveryDetails.courierVehicleType,
            packageDescription: order.deliveryDetails.packageDescription ?? null,
            packagePhotoUrl: order.deliveryDetails.packagePhotoUrl ?? null,
            declaredValue: order.deliveryDetails.declaredValue ?? null,
            isFragile: order.deliveryDetails.isFragile ?? false,
            requiresReturn: order.deliveryDetails.requiresReturn ?? false,
            cashOnDelivery: order.deliveryDetails.cashOnDelivery ?? null,
            deliveryStatus: order.deliveryDetails.deliveryStatus,
            proofPhotoUrl: order.deliveryDetails.proofPhotoUrl ?? null,
            proofSignatureUrl:
              order.deliveryDetails.proofSignatureUrl ?? null,
            recipientCode: order.deliveryDetails.recipientCode ?? null,
            updatedAt: order.deliveryDetails.updatedAt ?? order.updatedAt,
          }
        : null,
      payments: payment
        ? [
            {
              id: payment.id,
              status: payment.status,
              method: payment.method,
              amount: payment.amount,
              currency: payment.currency,
              provider: payment.provider,
              providerTransactionId: payment.providerTransactionId,
              refundedAmount: payment.refundedAmount,
              capturedAt: payment.capturedAt,
              createdAt: payment.createdAt,
            },
          ]
        : [],
      statusEvents: [],
    };
  }

  async refundPayment(
    paymentId: string,
    dto: {
      amount?: number;
      reason?: string;
    },
  ) {
    const payment = this.paymentsService
      .getAllPayments()
      .find((item) => item.id === paymentId);

    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    const totalAmount = Number(payment.amount);
    const refundedAmount = Number(payment.refundedAmount);
    const refundAmount = dto.amount ?? totalAmount - refundedAmount;
    const nextRefundedAmount = refundedAmount + refundAmount;

    payment.refundedAmount = nextRefundedAmount.toFixed(2);
    payment.status =
      nextRefundedAmount >= totalAmount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;

    return {
      ...payment,
    };
  }

  async restartOrderDispatch(orderId: string) {
    const order = this.ordersService.getById(orderId);
    return {
      id: order.id,
      serviceType: order.serviceType,
      status: order.status,
      clientId: order.clientId,
      executorId: order.executorId,
      cityId: order.cityId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      estimatedPrice: order.estimatedPrice,
      finalPrice: order.finalPrice,
      pickupAddress: order.routePoints[0]?.address ?? null,
      destinationAddress: order.routePoints.at(-1)?.address ?? null,
      deliveryStatus: order.deliveryDetails?.deliveryStatus ?? null,
      createdAt: order.createdAt,
      scheduledAt: order.scheduledAt,
    };
  }

  async cancelPayment(
    paymentId: string,
    dto: {
      reason?: string;
    },
  ) {
    void dto;
    const payment = this.paymentsService
      .getAllPayments()
      .find((item) => item.id === paymentId);

    if (!payment) {
      throw new NotFoundException({
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found',
      });
    }

    payment.status = PaymentStatus.CANCELLED;

    return {
      ...payment,
    };
  }

  async updateOrderStatus(
    orderId: string,
    dto: {
      status: OrderStatus.CANCELLED_SYSTEM | OrderStatus.FAILED;
      reason?: string;
    },
  ) {
    const order = this.ordersService.getById(orderId);
    order.status = dto.status;

    if (dto.status === OrderStatus.CANCELLED_SYSTEM) {
      order.cancelledAt = new Date('2025-01-01T04:30:00Z');
      order.cancelReason = dto.reason ?? null;
      this.paymentsService.partialRefundOrder(orderId);
    }

    if (dto.status === OrderStatus.FAILED) {
      order.cancelReason = dto.reason ?? null;
      if (order.deliveryDetails) {
        order.deliveryDetails.deliveryStatus = DeliveryStatus.DELIVERY_FAILED;
      }
    }

    return {
      id: order.id,
      serviceType: order.serviceType,
      status: order.status,
      clientId: order.clientId,
      executorId: order.executorId,
      cityId: order.cityId,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      estimatedPrice: order.estimatedPrice,
      finalPrice: order.finalPrice,
      pickupAddress: order.routePoints[0]?.address ?? null,
      destinationAddress: order.routePoints.at(-1)?.address ?? null,
      deliveryStatus: order.deliveryDetails?.deliveryStatus ?? null,
      createdAt: order.createdAt,
      scheduledAt: order.scheduledAt,
    };
  }

  async createTariff(userId: string, dto: Record<string, unknown>) {
    const tariffId = makeUuid(7000 + this.tariffs.size);
    const entity = {
      id: tariffId,
      createdById: userId,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validTo: null,
      isActive: true,
      ...dto,
    };
    this.tariffs.set(tariffId, entity);
    this.syncTariffToOrders(entity);
    return entity;
  }

  async updateTariff(
    tariffId: string,
    userId: string,
    dto: Record<string, unknown>,
  ) {
    const previous = this.tariffs.get(tariffId) ?? {
      id: tariffId,
      createdById: userId,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      validFrom: new Date('2025-01-01T00:00:00Z'),
      validTo: null,
      isActive: true,
    };
    const entity = {
      ...previous,
      ...dto,
    };
    this.tariffs.set(tariffId, entity);
    this.syncTariffToOrders(entity);
    return entity;
  }

  async blockExecutor(executorId: string, isBlocked: boolean) {
    this.dispatchService.setExecutorBlocked(executorId, isBlocked);
    return {
      id: executorId,
      userId: executorId,
      isBlocked,
      verificationStatus: 'verified',
    };
  }

  async getFinancialReport(query: {
    period?: 'day' | 'week' | 'month';
    cityId?: string;
  }) {
    const payments = this.paymentsService.getAllPayments();
    const hasCityScope = !query.cityId || query.cityId === TEST_CITY_ID;
    const capturedAmount = payments
      .filter((payment) => payment.status === PaymentStatus.CAPTURED)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const refundedAmount = payments
      .filter((payment) => payment.status === PaymentStatus.PARTIALLY_REFUNDED)
      .reduce((sum, payment) => sum + Number(payment.refundedAmount), 0);

    return {
      period: query.period ?? 'day',
      cityId: query.cityId ?? null,
      from: '2025-01-01T00:00:00.000Z',
      to: '2025-01-01T23:59:59.999Z',
      paymentsCount: hasCityScope ? payments.length : 0,
      completedOrdersCount: hasCityScope
        ? this.ordersService
            .getOrdersSnapshot()
            .filter((order) => order.status === OrderStatus.COMPLETED).length
        : 0,
      capturedAmountByCurrency: {
        KZT: hasCityScope ? capturedAmount : 0,
      },
      refundedAmountByCurrency: {
        KZT: hasCityScope ? refundedAmount : 0,
      },
    };
  }

  async getOperationsReport(query: {
    period?: 'day' | 'week' | 'month';
    cityId?: string;
  }) {
    const orders = this.ordersService.getOrdersSnapshot().filter((order) =>
      query.cityId ? order.cityId === query.cityId : true,
    );

    return {
      period: query.period ?? 'day',
      from: '2025-01-01T00:00:00.000Z',
      to: '2025-01-01T23:59:59.999Z',
      cityId: query.cityId ?? null,
      totalOrders: orders.length,
      ordersByStatus: orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
      }, {}),
      ordersByServiceType: orders.reduce<Record<string, number>>((acc, order) => {
        acc[order.serviceType] = (acc[order.serviceType] ?? 0) + 1;
        return acc;
      }, {}),
      activeExecutors: 1,
      verifiedExecutors: 1,
    };
  }

  private syncTariffToOrders(entity: Record<string, unknown>): void {
    if (entity.serviceType !== ServiceType.TAXI) {
      return;
    }

    this.ordersService.updateTaxiTariff({
      basePrice:
        typeof entity.basePrice === 'number' ? entity.basePrice : undefined,
      pricePerKm:
        typeof entity.pricePerKm === 'number' ? entity.pricePerKm : undefined,
      pricePerMinute:
        typeof entity.pricePerMinute === 'number'
          ? entity.pricePerMinute
          : undefined,
      minimumPrice:
        typeof entity.minimumPrice === 'number'
          ? entity.minimumPrice
          : undefined,
    });
  }
}

export async function createPlatformE2EHarness(): Promise<E2EHarness> {
  const authService = new E2EAuthServiceDouble();
  const ordersService = new E2EOrdersServiceDouble();
  const paymentsService = new E2EPaymentsServiceDouble(ordersService);
  ordersService.attachPaymentsService(paymentsService);
  const dispatchService = new E2EDispatchServiceDouble(ordersService);
  const adminService = new E2EAdminServiceDouble(
    ordersService,
    dispatchService,
    paymentsService,
  );

  const moduleRef = await Test.createTestingModule({
    controllers: [
      AuthController,
      AdminController,
      OrdersController,
      DispatchController,
      ExecutorOrdersController,
      PaymentsController,
    ],
    providers: [
      Reflector,
      RolesGuard,
      {
        provide: AuthService,
        useValue: authService,
      },
      {
        provide: OrdersService,
        useValue: ordersService,
      },
      {
        provide: DispatchService,
        useValue: dispatchService,
      },
      {
        provide: PaymentsService,
        useValue: paymentsService,
      },
      {
        provide: AdminService,
        useValue: adminService,
      },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(new E2EJwtAuthGuard(authService))
    .overrideGuard(ThrottlerGuard)
    .useValue(new AllowThrottlerGuard())
    .compile();

  const app = moduleRef.createNestApplication();
  configureHttpApplication(app, {
    apiPrefix: 'api/v1',
  });
  await app.init();
  app.getHttpServer = () => app.getHttpAdapter().getInstance();

  return {
    app,
    authService,
    ordersService,
    dispatchService,
    paymentsService,
    adminService,
    close: () => app.close(),
  };
}

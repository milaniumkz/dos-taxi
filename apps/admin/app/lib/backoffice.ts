import { readAdminApiResponse } from "./admin-http";
import { resolveAdminRuntimeConfig } from "./admin-env";

export type CurrencyCode = "RUB" | "KZT";
export type ServiceType =
  | "taxi"
  | "delivery"
  | "intercity"
  | "cargo"
  | "scooter";
export type OrderStatus =
  | "draft"
  | "searching"
  | "accepted"
  | "arriving"
  | "waiting"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled_client"
  | "cancelled_executor"
  | "cancelled_system"
  | "failed";
export type DeliveryStatus =
  | "pending_pickup"
  | "picked_up"
  | "in_transit"
  | "at_door"
  | "delivered_confirmed"
  | "delivery_failed"
  | "returning";
export type PaymentMethod =
  | "card"
  | "cash"
  | "transfer_kaspi"
  | "transfer_halyk"
  | "corporate"
  | "bonus";
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "refunded"
  | "partially_refunded"
  | "cancelled"
  | "failed";
export type ExecutorTypeValue = "driver" | "courier" | "cargo_driver";
export type VehicleTypeValue = "bicycle" | "moped" | "scooter" | "car";
export type VerificationStatusValue = "pending" | "verified" | "rejected";
export type AdminNoteEntityType =
  | "order"
  | "user"
  | "executor"
  | "city"
  | "tariff"
  | "promo_code";
export type AdminNoteKind = "context" | "handoff" | "escalation";
export type AdminNoteState = "open" | "resolved" | "archived";
export type AdminActivityEntityType =
  | "order"
  | "user"
  | "executor"
  | "city"
  | "tariff"
  | "promo_code"
  | "payment";
export type AdminActivityAction =
  | "city.created"
  | "city.updated"
  | "tariff.created"
  | "tariff.updated"
  | "order.created"
  | "order.creation_requested"
  | "order.assigned"
  | "order.status_updated"
  | "order.dispatch_retried"
  | "note.created"
  | "note.updated"
  | "user.updated"
  | "executor.updated"
  | "executor.verified"
  | "executor.blocked"
  | "promo_code.created"
  | "promo_code.updated"
  | "payment.refunded"
  | "payment.cancelled";

export type CitySnapshot = {
  id: string;
  nameRu: string;
  nameKk: string;
  countryCode: string;
  currency: CurrencyCode;
  timezone: string;
  isActive: boolean;
};

export type TariffSnapshot = {
  id: string;
  cityId: string;
  serviceType: ServiceType;
  vehicleClass: string | null;
  nameRu: string;
  nameKk: string;
  basePrice: string;
  pricePerKm: string;
  pricePerMinute: string;
  minimumPrice: string;
  freeWaitingSeconds: number;
  paidWaitingPerMinute: string;
  commissionPercent: string;
  commissionFixed: string;
  currency: CurrencyCode;
  isActive: boolean;
  validFrom: string;
  validTo: string | null;
  createdById?: string | null;
};

export type AdminOrderSnapshot = {
  id: string;
  serviceType: ServiceType;
  status: OrderStatus;
  clientId: string;
  executorId: string | null;
  cityId: string;
  currency: CurrencyCode;
  paymentMethod: PaymentMethod;
  estimatedPrice: string | null;
  finalPrice: string | null;
  discountAmount: string;
  promoCodeId: string | null;
  promoCodeCode: string | null;
  pickupAddress: string | null;
  destinationAddress: string | null;
  deliveryStatus: DeliveryStatus | null;
  createdAt: string;
  scheduledAt: string | null;
};

export type AdminOrderPartySnapshot = {
  id: string;
  name: string | null;
  phone: string;
  isBlocked: boolean;
};

export type AdminOrderExecutorPartySnapshot = AdminOrderPartySnapshot & {
  userId: string;
  executorType: ExecutorTypeValue;
  vehicleType: VehicleTypeValue | null;
  carClass: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehiclePlate: string | null;
  isOnline: boolean;
  verificationStatus: VerificationStatusValue;
};

export type AdminOrderCitySnapshot = {
  id: string;
  nameRu: string;
  nameKk: string;
  currency: CurrencyCode;
};

export type AdminOrderRoutePointSnapshot = {
  id: string;
  sequenceIndex: number;
  lat: number;
  lng: number;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  notes: string | null;
};

export type AdminOrderDeliverySnapshot = {
  courierVehicleType: VehicleTypeValue;
  packageDescription: string | null;
  packagePhotoUrl: string | null;
  declaredValue: string | null;
  isFragile: boolean;
  requiresReturn: boolean;
  cashOnDelivery: string | null;
  deliveryStatus: DeliveryStatus;
  proofPhotoUrl: string | null;
  proofSignatureUrl: string | null;
  recipientCode: string | null;
  updatedAt: string;
};

export type AdminOrderPaymentSnapshot = {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: string;
  currency: CurrencyCode;
  provider: string | null;
  providerTransactionId: string | null;
  refundedAmount: string;
  capturedAt: string | null;
  createdAt: string;
};

export type AdminOrderStatusEventSnapshot = {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminOrderDetailSnapshot = AdminOrderSnapshot & {
  client: AdminOrderPartySnapshot | null;
  executor: AdminOrderExecutorPartySnapshot | null;
  city: AdminOrderCitySnapshot | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  clientRating: number | null;
  executorRating: number | null;
  updatedAt: string;
  routePoints: AdminOrderRoutePointSnapshot[];
  delivery: AdminOrderDeliverySnapshot | null;
  payments: AdminOrderPaymentSnapshot[];
  statusEvents: AdminOrderStatusEventSnapshot[];
};

export type FinancialSnapshot = {
  period: string;
  cityId: string | null;
  from: string;
  to: string;
  paymentsCount: number;
  completedOrdersCount: number;
  capturedAmountByCurrency: Record<string, number>;
  refundedAmountByCurrency: Record<string, number>;
};

export type OperationsSnapshot = {
  period: string;
  from: string;
  to: string;
  cityId: string | null;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  ordersByServiceType: Record<string, number>;
  activeExecutors: number;
  verifiedExecutors: number;
};

export type PromoCodeSnapshot = {
  id: string;
  code: string;
  discountType: string;
  discountValue: string;
  maxUses: number | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromoCodeAnalyticsCitySnapshot = {
  cityId: string;
  cityNameRu: string;
  cityNameKk: string;
  orderCount: number;
  completedOrders: number;
  grossTotalsByCurrency: Record<string, number>;
  discountTotalsByCurrency: Record<string, number>;
};

export type PromoCodeAnalyticsPaymentMethodSnapshot = {
  paymentMethod: PaymentMethod;
  orderCount: number;
  grossTotalsByCurrency: Record<string, number>;
  discountTotalsByCurrency: Record<string, number>;
};

export type PromoCodeAnalyticsStatusSnapshot = {
  status: OrderStatus;
  orderCount: number;
  grossTotalsByCurrency: Record<string, number>;
  discountTotalsByCurrency: Record<string, number>;
};

export type PromoCodeAnalyticsSnapshot = {
  promoCodeId: string;
  code: string | null;
  totalOrders: number;
  completedOrders: number;
  grossTotalsByCurrency: Record<string, number>;
  discountTotalsByCurrency: Record<string, number>;
  taxiOrders: number;
  deliveryOrders: number;
  uniqueClients: number;
  firstTimeRedemptions: number;
  repeatRedemptions: number;
  usageRate: number | null;
  completionRate: number;
  firstOrderConversion: number;
  lastRedeemedAt: string | null;
  cityBreakdown: PromoCodeAnalyticsCitySnapshot[];
  paymentMethodBreakdown: PromoCodeAnalyticsPaymentMethodSnapshot[];
  statusBreakdown: PromoCodeAnalyticsStatusSnapshot[];
};

export type UserSnapshot = {
  id: string;
  phone: string;
  name: string | null;
  preferredLanguage: "ru" | "kk";
  preferredCurrency: CurrencyCode;
  bonusBalance: string;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExecutorSnapshot = {
  id: string;
  userId: string;
  user: UserSnapshot | null;
  executorType: ExecutorTypeValue;
  vehicleType: VehicleTypeValue | null;
  carClass: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehiclePlate: string | null;
  isOnline: boolean;
  rating: string;
  cancelRate: string;
  balance: string;
  cityId: string | null;
  cityNameRu: string | null;
  cityNameKk: string | null;
  verificationStatus: VerificationStatusValue;
  isBlocked: boolean;
  createdAt: string;
};

export type ExecutorBalanceTopUpSnapshot = {
  id: string;
  executorId: string;
  executorName: string | null;
  executorPhone: string | null;
  amount: string;
  phone: string;
  status: "pending" | "invoiced" | "confirmed" | "rejected";
  invoiceProvider: string;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExecutorPayoutSnapshot = {
  id: string;
  executorId: string;
  executorName: string | null;
  executorPhone: string | null;
  amount: string;
  status: "pending" | "paid" | "rejected";
  method: "kaspi" | "halyk" | "cash";
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export type AdminNoteSnapshot = {
  id: string;
  entityType: AdminNoteEntityType;
  entityId: string;
  body: string;
  kind: AdminNoteKind;
  isPinned: boolean;
  state: AdminNoteState;
  createdById: string | null;
  createdByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

export type AdminNotesQuery = {
  entityType?: AdminNoteEntityType;
  entityId?: string;
  query?: string;
  authorQuery?: string;
  assignedToId?: string;
  assigneeQuery?: string;
  hasAssignee?: boolean;
  kind?: AdminNoteKind;
  isPinned?: boolean;
  state?: AdminNoteState;
  limit?: number;
};

export type AdminActivitySnapshot = {
  id: string;
  action: AdminActivityAction;
  entityType: AdminActivityEntityType;
  entityId: string;
  actorId: string | null;
  actorName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type AdminActivityGroup = "order" | "payment" | "note" | "moderation";
export type AdminActivityWindow = "hour" | "day" | "week";

export type AdminActivityQuery = {
  entityType?: AdminActivityEntityType;
  entityId?: string;
  action?: AdminActivityAction;
  group?: AdminActivityGroup;
  window?: AdminActivityWindow;
  actorId?: string;
  actorQuery?: string;
  query?: string;
  limit?: number;
};

export type UsersSnapshotQuery = {
  query?: string;
  preferredLanguage?: "ru" | "kk";
  isBlocked?: boolean;
  limit?: number;
};

export type ExecutorsSnapshotQuery = {
  query?: string;
  cityId?: string;
  executorType?: ExecutorTypeValue;
  vehicleType?: VehicleTypeValue;
  verificationStatus?: VerificationStatusValue;
  isOnline?: boolean;
  isBlocked?: boolean;
  limit?: number;
};

export type ReportsSnapshotQuery = {
  period?: "day" | "week" | "month";
  cityId?: string;
};

export type PromoCodeAnalyticsQuery = ReportsSnapshotQuery & {
  dateFrom?: string;
  dateTo?: string;
  status?: OrderStatus;
  serviceType?: ServiceType;
  paymentMethod?: PaymentMethod;
};

export type AdminOrdersQuery = {
  period?: ReportsSnapshotQuery["period"];
  status?: OrderStatus;
  serviceType?: ServiceType;
  paymentMethod?: PaymentMethod;
  promoCodeId?: string;
  cityId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
};

type AdminOrdersResponse = {
  items: Array<Parameters<typeof normalizeAdminOrderSnapshot>[0]>;
  nextCursor: string | null;
};

export type AdminOrdersSnapshot = {
  items: AdminOrderSnapshot[];
  nextCursor: string | null;
};

export type BackofficeSnapshot = {
  mode: "live" | "mixed" | "demo";
  sourceLabel: string;
  generatedAt: string;
  warnings: string[];
  cities: CitySnapshot[];
  tariffs: TariffSnapshot[];
  orders: AdminOrderSnapshot[];
  financial: FinancialSnapshot;
  operations: OperationsSnapshot;
};

export type DispatchSettingsSnapshot = {
  maxRadiusKm: number;
  distanceWeight: number;
  ratingWeight: number;
  activityWeight: number;
  priorityWeight: number;
  maxCandidates: number;
};

export type DriverBonusSettingsSnapshot = {
  isEnabled: boolean;
  ordersRequired: number;
  bonusAmount: number;
};

const DEFAULT_DISPATCH_SETTINGS: DispatchSettingsSnapshot = {
  maxRadiusKm: 3,
  distanceWeight: 0.6,
  ratingWeight: 0.2,
  activityWeight: 0.15,
  priorityWeight: 0.05,
  maxCandidates: 5,
};

const DEFAULT_DRIVER_BONUS_SETTINGS: DriverBonusSettingsSnapshot = {
  isEnabled: true,
  ordersRequired: 20,
  bonusAmount: 5000,
};

const DEMO_CITIES: CitySnapshot[] = [
  {
    id: "city-almaty",
    nameRu: "Алматы",
    nameKk: "Алматы",
    countryCode: "KZ",
    currency: "KZT",
    timezone: "Asia/Almaty",
    isActive: true,
  },
  {
    id: "city-astana",
    nameRu: "Астана",
    nameKk: "Астана",
    countryCode: "KZ",
    currency: "KZT",
    timezone: "Asia/Almaty",
    isActive: false,
  },
];

const DEMO_TARIFFS: TariffSnapshot[] = [
  {
    id: "tariff-taxi-economy",
    cityId: "city-almaty",
    serviceType: "taxi",
    vehicleClass: "economy",
    nameRu: "Такси Эконом",
    nameKk: "Такси Эконом",
    basePrice: "650.00",
    pricePerKm: "132.0000",
    pricePerMinute: "38.0000",
    minimumPrice: "1450.00",
    freeWaitingSeconds: 180,
    paidWaitingPerMinute: "0.0000",
    commissionPercent: "0.00",
    commissionFixed: "0.00",
    currency: "KZT",
    isActive: true,
    validFrom: "2025-01-01T00:00:00.000Z",
    validTo: null,
  },
  {
    id: "tariff-delivery-bike",
    cityId: "city-almaty",
    serviceType: "delivery",
    vehicleClass: "bicycle",
    nameRu: "Доставка Велокурьер",
    nameKk: "Велокурьер",
    basePrice: "900.00",
    pricePerKm: "88.0000",
    pricePerMinute: "22.0000",
    minimumPrice: "1600.00",
    freeWaitingSeconds: 180,
    paidWaitingPerMinute: "0.0000",
    commissionPercent: "0.00",
    commissionFixed: "0.00",
    currency: "KZT",
    isActive: true,
    validFrom: "2025-01-01T00:00:00.000Z",
    validTo: null,
  },
  {
    id: "tariff-delivery-car",
    cityId: "city-almaty",
    serviceType: "delivery",
    vehicleClass: "car",
    nameRu: "Доставка Автокурьер",
    nameKk: "Автокурьер",
    basePrice: "1350.00",
    pricePerKm: "118.0000",
    pricePerMinute: "30.0000",
    minimumPrice: "2100.00",
    freeWaitingSeconds: 180,
    paidWaitingPerMinute: "0.0000",
    commissionPercent: "0.00",
    commissionFixed: "0.00",
    currency: "KZT",
    isActive: true,
    validFrom: "2025-01-01T00:00:00.000Z",
    validTo: null,
  },
];

const DEMO_ORDERS: AdminOrderSnapshot[] = [
  {
    id: "order-201",
    serviceType: "taxi",
    status: "searching",
    clientId: "client-01",
    executorId: null,
    cityId: "city-almaty",
    currency: "KZT",
    paymentMethod: "card",
    estimatedPrice: "2410.00",
    finalPrice: null,
    discountAmount: "240.00",
    promoCodeId: "promo-newyear",
    promoCodeCode: "NEWYEAR10",
    pickupAddress: "Абая, 10",
    destinationAddress: "Достык, 15",
    deliveryStatus: null,
    createdAt: "2025-01-01T08:15:00.000Z",
    scheduledAt: null,
  },
  {
    id: "order-202",
    serviceType: "taxi",
    status: "arriving",
    clientId: "client-02",
    executorId: "executor-07",
    cityId: "city-almaty",
    currency: "KZT",
    paymentMethod: "cash",
    estimatedPrice: "2890.00",
    finalPrice: null,
    discountAmount: "0.00",
    promoCodeId: null,
    promoCodeCode: null,
    pickupAddress: "Сатпаева, 22",
    destinationAddress: "Тимирязева, 31",
    deliveryStatus: null,
    createdAt: "2025-01-01T08:03:00.000Z",
    scheduledAt: null,
  },
  {
    id: "order-203",
    serviceType: "delivery",
    status: "in_progress",
    clientId: "client-03",
    executorId: "executor-13",
    cityId: "city-almaty",
    currency: "KZT",
    paymentMethod: "card",
    estimatedPrice: "1980.00",
    finalPrice: null,
    discountAmount: "0.00",
    promoCodeId: null,
    promoCodeCode: null,
    pickupAddress: "Розыбакиева, 101",
    destinationAddress: "Жандосова, 55",
    deliveryStatus: "at_door",
    createdAt: "2025-01-01T07:48:00.000Z",
    scheduledAt: null,
  },
  {
    id: "order-204",
    serviceType: "delivery",
    status: "completed",
    clientId: "client-04",
    executorId: "executor-15",
    cityId: "city-almaty",
    currency: "KZT",
    paymentMethod: "card",
    estimatedPrice: "2420.00",
    finalPrice: "2420.00",
    discountAmount: "500.00",
    promoCodeId: "promo-delivery",
    promoCodeCode: "DELIV500",
    pickupAddress: "Кабанбай Батыра, 87",
    destinationAddress: "Аль-Фараби, 140",
    deliveryStatus: "delivered_confirmed",
    createdAt: "2025-01-01T06:30:00.000Z",
    scheduledAt: null,
  },
  {
    id: "order-205",
    serviceType: "taxi",
    status: "completed",
    clientId: "client-05",
    executorId: "executor-21",
    cityId: "city-almaty",
    currency: "KZT",
    paymentMethod: "card",
    estimatedPrice: "3150.00",
    finalPrice: "3290.00",
    discountAmount: "150.00",
    promoCodeId: "promo-newyear",
    promoCodeCode: "NEWYEAR10",
    pickupAddress: "Мангилик Ел, 18",
    destinationAddress: "Байтурсынова, 95",
    deliveryStatus: null,
    createdAt: "2025-01-01T05:20:00.000Z",
    scheduledAt: null,
  },
];

const DEMO_FINANCIAL: FinancialSnapshot = {
  period: "day",
  cityId: null,
  from: "2025-01-01T00:00:00.000Z",
  to: "2025-01-01T23:59:59.999Z",
  paymentsCount: 38,
  completedOrdersCount: 26,
  capturedAmountByCurrency: {
    KZT: 184500,
    RUB: 0,
  },
  refundedAmountByCurrency: {
    KZT: 12600,
    RUB: 0,
  },
};

const DEMO_OPERATIONS: OperationsSnapshot = {
  period: "day",
  from: "2025-01-01T00:00:00.000Z",
  to: "2025-01-01T23:59:59.999Z",
  cityId: null,
  totalOrders: 54,
  ordersByStatus: {
    searching: 6,
    arriving: 4,
    waiting: 2,
    in_progress: 8,
    completed: 31,
    cancelled_client: 2,
    failed: 1,
  },
  ordersByServiceType: {
    taxi: 37,
    delivery: 17,
  },
  activeExecutors: 29,
  verifiedExecutors: 41,
};

const DEMO_PROMO_CODES: PromoCodeSnapshot[] = [
  {
    id: "promo-newyear",
    code: "NEWYEAR10",
    discountType: "percent",
    discountValue: "10.00",
    maxUses: 100,
    validTo: "2025-01-31T23:59:59.999Z",
    isActive: true,
    createdAt: "2025-01-01T06:00:00.000Z",
    updatedAt: "2025-01-01T06:00:00.000Z",
  },
  {
    id: "promo-delivery",
    code: "DELIV500",
    discountType: "fixed",
    discountValue: "500.00",
    maxUses: null,
    validTo: null,
    isActive: false,
    createdAt: "2025-01-01T05:00:00.000Z",
    updatedAt: "2025-01-01T05:30:00.000Z",
  },
];

const DEMO_USERS: UserSnapshot[] = [
  {
    id: "client-01",
    phone: "+77010000001",
    name: "Алия Сарсенова",
    preferredLanguage: "ru",
    preferredCurrency: "KZT",
    bonusBalance: "1200.00",
    isBlocked: false,
    createdAt: "2025-01-01T05:20:00.000Z",
    updatedAt: "2025-01-01T05:20:00.000Z",
  },
  {
    id: "client-02",
    phone: "+77010000002",
    name: "Ержан Т.",
    preferredLanguage: "kk",
    preferredCurrency: "KZT",
    bonusBalance: "0.00",
    isBlocked: false,
    createdAt: "2025-01-01T05:40:00.000Z",
    updatedAt: "2025-01-01T05:40:00.000Z",
  },
  {
    id: "client-03",
    phone: "+77010000003",
    name: "Марина Ким",
    preferredLanguage: "ru",
    preferredCurrency: "KZT",
    bonusBalance: "500.00",
    isBlocked: true,
    createdAt: "2025-01-01T06:05:00.000Z",
    updatedAt: "2025-01-01T06:30:00.000Z",
  },
  {
    id: "client-04",
    phone: "+77010000004",
    name: "Дана И.",
    preferredLanguage: "kk",
    preferredCurrency: "KZT",
    bonusBalance: "300.00",
    isBlocked: false,
    createdAt: "2025-01-01T04:45:00.000Z",
    updatedAt: "2025-01-01T04:45:00.000Z",
  },
  {
    id: "client-05",
    phone: "+77010000005",
    name: "Игорь П.",
    preferredLanguage: "ru",
    preferredCurrency: "KZT",
    bonusBalance: "50.00",
    isBlocked: false,
    createdAt: "2025-01-01T03:40:00.000Z",
    updatedAt: "2025-01-01T03:40:00.000Z",
  },
];

const DEMO_EXECUTORS: ExecutorSnapshot[] = [
  {
    id: "executor-07",
    userId: "executor-user-07",
    user: {
      id: "executor-user-07",
      phone: "+77070000007",
      name: "Руслан А.",
      preferredLanguage: "ru",
      preferredCurrency: "KZT",
      bonusBalance: "0.00",
      isBlocked: false,
      createdAt: "2025-01-01T04:50:00.000Z",
      updatedAt: "2025-01-01T04:50:00.000Z",
    },
    executorType: "driver",
    vehicleType: null,
    carClass: "comfort",
    vehicleMake: "Toyota",
    vehicleModel: "Camry",
    vehicleYear: 2021,
    vehiclePlate: "123 ABC 02",
    isOnline: true,
    rating: "4.92",
    cancelRate: "1.30",
    balance: "48200.00",
    cityId: "city-almaty",
    cityNameRu: "Алматы",
    cityNameKk: "Алматы",
    verificationStatus: "verified",
    isBlocked: false,
    createdAt: "2025-01-01T04:50:00.000Z",
  },
  {
    id: "executor-13",
    userId: "executor-user-13",
    user: {
      id: "executor-user-13",
      phone: "+77070000013",
      name: "Нұрдәулет",
      preferredLanguage: "kk",
      preferredCurrency: "KZT",
      bonusBalance: "0.00",
      isBlocked: false,
      createdAt: "2025-01-01T04:30:00.000Z",
      updatedAt: "2025-01-01T04:30:00.000Z",
    },
    executorType: "courier",
    vehicleType: "moped",
    carClass: null,
    vehicleMake: null,
    vehicleModel: null,
    vehicleYear: null,
    vehiclePlate: null,
    isOnline: true,
    rating: "4.81",
    cancelRate: "2.10",
    balance: "32100.00",
    cityId: "city-almaty",
    cityNameRu: "Алматы",
    cityNameKk: "Алматы",
    verificationStatus: "verified",
    isBlocked: false,
    createdAt: "2025-01-01T04:30:00.000Z",
  },
  {
    id: "executor-15",
    userId: "executor-user-15",
    user: {
      id: "executor-user-15",
      phone: "+77070000015",
      name: "Мадина К.",
      preferredLanguage: "kk",
      preferredCurrency: "KZT",
      bonusBalance: "0.00",
      isBlocked: false,
      createdAt: "2025-01-01T04:05:00.000Z",
      updatedAt: "2025-01-01T04:05:00.000Z",
    },
    executorType: "courier",
    vehicleType: "car",
    carClass: null,
    vehicleMake: "Hyundai",
    vehicleModel: "Accent",
    vehicleYear: 2019,
    vehiclePlate: "777 ADA 02",
    isOnline: false,
    rating: "4.74",
    cancelRate: "1.90",
    balance: "25700.00",
    cityId: "city-almaty",
    cityNameRu: "Алматы",
    cityNameKk: "Алматы",
    verificationStatus: "verified",
    isBlocked: false,
    createdAt: "2025-01-01T04:05:00.000Z",
  },
  {
    id: "executor-21",
    userId: "executor-user-21",
    user: {
      id: "executor-user-21",
      phone: "+77070000021",
      name: "Айбек С.",
      preferredLanguage: "ru",
      preferredCurrency: "KZT",
      bonusBalance: "0.00",
      isBlocked: true,
      createdAt: "2025-01-01T03:55:00.000Z",
      updatedAt: "2025-01-01T06:10:00.000Z",
    },
    executorType: "driver",
    vehicleType: null,
    carClass: "economy",
    vehicleMake: "Kia",
    vehicleModel: "Rio",
    vehicleYear: 2018,
    vehiclePlate: "456 DOS 02",
    isOnline: false,
    rating: "4.66",
    cancelRate: "4.90",
    balance: "17800.00",
    cityId: "city-almaty",
    cityNameRu: "Алматы",
    cityNameKk: "Алматы",
    verificationStatus: "pending",
    isBlocked: true,
    createdAt: "2025-01-01T03:55:00.000Z",
  },
];

const DEMO_ADMIN_NOTES: AdminNoteSnapshot[] = [
  {
    id: "note-order-201-1",
    entityType: "order",
    entityId: "order-201",
    body: "Клиент уже звонил дважды. Если поиск не найдёт исполнителя в ближайшие минуты, нужен ручной контроль.",
    kind: "handoff",
    isPinned: true,
    state: "open",
    createdById: "staff-operator-01",
    createdByName: "Жанар О.",
    assignedToId: "staff-operator-02",
    assignedToName: "Руслан Н.",
    createdAt: "2025-01-01T08:22:00.000Z",
    resolvedAt: null,
    archivedAt: null,
    updatedAt: "2025-01-01T08:22:00.000Z",
  },
  {
    id: "note-user-03-1",
    entityType: "user",
    entityId: "client-03",
    body: "Профиль был временно заблокирован после серии спорных отмен. При новом обращении проверить контекст перед разблокировкой.",
    kind: "escalation",
    isPinned: true,
    state: "resolved",
    createdById: "staff-support-01",
    createdByName: "Support Desk",
    assignedToId: "staff-operator-01",
    assignedToName: "Жанар О.",
    createdAt: "2025-01-01T07:05:00.000Z",
    resolvedAt: "2025-01-01T07:55:00.000Z",
    archivedAt: null,
    updatedAt: "2025-01-01T07:55:00.000Z",
  },
  {
    id: "note-executor-21-1",
    entityType: "executor",
    entityId: "executor-21",
    body: "Нужна повторная проверка документов и причин повышенного cancel rate до следующего допуска в линию.",
    kind: "handoff",
    isPinned: false,
    state: "open",
    createdById: "staff-operator-01",
    createdByName: "Жанар О.",
    assignedToId: null,
    assignedToName: null,
    createdAt: "2025-01-01T06:40:00.000Z",
    resolvedAt: null,
    archivedAt: null,
    updatedAt: "2025-01-01T06:40:00.000Z",
  },
  {
    id: "note-executor-13-1",
    entityType: "executor",
    entityId: "executor-13",
    body: "Сильный курьер для dense delivery-зоны. Можно использовать как fallback при ручном назначении.",
    kind: "context",
    isPinned: false,
    state: "archived",
    createdById: "staff-operator-02",
    createdByName: "Руслан Н.",
    assignedToId: null,
    assignedToName: null,
    createdAt: "2025-01-01T05:55:00.000Z",
    resolvedAt: "2025-01-01T06:10:00.000Z",
    archivedAt: "2025-01-01T06:20:00.000Z",
    updatedAt: "2025-01-01T06:20:00.000Z",
  },
  {
    id: "note-city-almaty-1",
    entityType: "city",
    entityId: "city-almaty",
    body: "Город активен как основной MVP-контур. Перед расширением зоны обслуживания сверить тарифы и ручные SLA операторов.",
    kind: "context",
    isPinned: false,
    state: "open",
    createdById: "staff-admin-01",
    createdByName: "Admin Shift",
    assignedToId: null,
    assignedToName: null,
    createdAt: "2025-01-01T06:15:00.000Z",
    resolvedAt: null,
    archivedAt: null,
    updatedAt: "2025-01-01T06:15:00.000Z",
  },
  {
    id: "note-tariff-taxi-1",
    entityType: "tariff",
    entityId: "tariff-taxi-economy",
    body: "Эконом-тариф используется как базовый reference для ночного коэффициента. Любое изменение minimum price нужно согласовывать с операторами.",
    kind: "handoff",
    isPinned: true,
    state: "open",
    createdById: "staff-admin-01",
    createdByName: "Admin Shift",
    assignedToId: "staff-operator-01",
    assignedToName: "Жанар О.",
    createdAt: "2025-01-01T07:18:00.000Z",
    resolvedAt: null,
    archivedAt: null,
    updatedAt: "2025-01-01T07:18:00.000Z",
  },
  {
    id: "note-promo-newyear-1",
    entityType: "promo_code",
    entityId: "promo-newyear",
    body: "Промокод используется в новогоднем маркетинговом слоте. При ручном отключении предупредить поддержку и finance о росте обращений.",
    kind: "escalation",
    isPinned: true,
    state: "open",
    createdById: "staff-marketing-01",
    createdByName: "Marketing",
    assignedToId: "staff-operator-02",
    assignedToName: "Руслан Н.",
    createdAt: "2025-01-01T05:58:00.000Z",
    resolvedAt: null,
    archivedAt: null,
    updatedAt: "2025-01-01T05:58:00.000Z",
  },
];

const DEMO_ADMIN_ACTIVITY: AdminActivitySnapshot[] = [
  {
    id: "activity-order-201-1",
    action: "order.dispatch_retried",
    entityType: "order",
    entityId: "order-201",
    actorId: "staff-operator-01",
    actorName: "Жанар О.",
    metadata: {
      status: "searching",
    },
    createdAt: "2025-01-01T08:26:00.000Z",
  },
  {
    id: "activity-note-order-201-1",
    action: "note.created",
    entityType: "order",
    entityId: "order-201",
    actorId: "staff-operator-01",
    actorName: "Жанар О.",
    metadata: {
      noteId: "note-order-201-1",
      kind: "handoff",
      state: "open",
      isPinned: true,
      assignedToId: "staff-operator-02",
    },
    createdAt: "2025-01-01T08:22:00.000Z",
  },
  {
    id: "activity-payment-204-1",
    action: "payment.refunded",
    entityType: "payment",
    entityId: "payment-204-1",
    actorId: "staff-finance-01",
    actorName: "Finance Desk",
    metadata: {
      orderId: "order-204",
      amount: 1200,
      reason: "duplicate charge",
      status: "refunded",
    },
    createdAt: "2025-01-01T08:05:00.000Z",
  },
  {
    id: "activity-executor-21-1",
    action: "executor.blocked",
    entityType: "executor",
    entityId: "executor-21",
    actorId: "staff-operator-02",
    actorName: "Руслан Н.",
    metadata: {
      isBlocked: true,
    },
    createdAt: "2025-01-01T07:58:00.000Z",
  },
  {
    id: "activity-user-03-1",
    action: "user.updated",
    entityType: "user",
    entityId: "client-03",
    actorId: "staff-support-01",
    actorName: "Support Desk",
    metadata: {
      isBlocked: true,
    },
    createdAt: "2025-01-01T07:54:00.000Z",
  },
  {
    id: "activity-tariff-1",
    action: "tariff.updated",
    entityType: "tariff",
    entityId: "tariff-taxi-economy",
    actorId: "staff-admin-01",
    actorName: "Admin Shift",
    metadata: {
      cityId: "city-almaty",
      serviceType: "taxi",
      vehicleClass: "economy",
      isActive: true,
    },
    createdAt: "2025-01-01T07:25:00.000Z",
  },
  {
    id: "activity-city-1",
    action: "city.updated",
    entityType: "city",
    entityId: "city-almaty",
    actorId: "staff-admin-01",
    actorName: "Admin Shift",
    metadata: {
      isActive: true,
      timezone: "Asia/Almaty",
    },
    createdAt: "2025-01-01T06:40:00.000Z",
  },
  {
    id: "activity-promo-1",
    action: "promo_code.created",
    entityType: "promo_code",
    entityId: "promo-newyear",
    actorId: "staff-marketing-01",
    actorName: "Marketing",
    metadata: {
      code: "NEWYEAR10",
      isActive: true,
      discountType: "percent",
    },
    createdAt: "2025-01-01T05:50:00.000Z",
  },
];

function createDemoSnapshot(): BackofficeSnapshot {
  return {
    mode: "demo",
    sourceLabel: "Demo snapshot",
    generatedAt: new Date("2025-01-01T09:00:00.000Z").toISOString(),
    warnings: ["ADMIN_API_TOKEN_MISSING"],
    cities: DEMO_CITIES,
    tariffs: DEMO_TARIFFS,
    orders: DEMO_ORDERS,
    financial: DEMO_FINANCIAL,
    operations: DEMO_OPERATIONS,
  };
}

export function getAdminApiBaseUrl(): string {
  return resolveAdminRuntimeConfig().apiBaseUrl;
}

export function getAdminApiToken(): string {
  return resolveAdminRuntimeConfig().apiToken;
}

async function fetchAdminJson<T>(
  path: string,
  apiBaseUrl: string,
  apiToken: string,
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/${path}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  return readAdminApiResponse<T>(response, path);
}

function normalizeLanguage(value: string | null | undefined): "ru" | "kk" {
  return value === "kk" ? "kk" : "ru";
}

function normalizeCurrency(value: string | null | undefined): CurrencyCode {
  return value === "RUB" ? "RUB" : "KZT";
}

function normalizeServiceType(value: string | null | undefined): ServiceType {
  if (
    value === "delivery" ||
    value === "intercity" ||
    value === "cargo" ||
    value === "scooter"
  ) {
    return value;
  }

  return "taxi";
}

function normalizeOrderStatus(value: string | null | undefined): OrderStatus {
  switch (value) {
    case "searching":
    case "accepted":
    case "arriving":
    case "waiting":
    case "in_progress":
    case "delivered":
    case "completed":
    case "cancelled_client":
    case "cancelled_executor":
    case "cancelled_system":
    case "failed":
      return value;
    default:
      return "draft";
  }
}

function normalizeDeliveryStatus(
  value: string | null | undefined,
): DeliveryStatus {
  switch (value) {
    case "picked_up":
    case "in_transit":
    case "at_door":
    case "delivered_confirmed":
    case "delivery_failed":
    case "returning":
      return value;
    default:
      return "pending_pickup";
  }
}

function normalizePaymentMethod(
  value: string | null | undefined,
): PaymentMethod {
  switch (value) {
    case "cash":
    case "transfer_kaspi":
    case "transfer_halyk":
    case "corporate":
    case "bonus":
      return value;
    default:
      return "card";
  }
}

function normalizePaymentStatus(
  value: string | null | undefined,
): PaymentStatus {
  switch (value) {
    case "authorized":
    case "captured":
    case "refunded":
    case "partially_refunded":
    case "cancelled":
    case "failed":
      return value;
    default:
      return "pending";
  }
}

function normalizeExecutorType(
  value: string | null | undefined,
): ExecutorTypeValue {
  return value === "courier" || value === "cargo_driver" ? value : "driver";
}

function normalizeVehicleType(
  value: string | null | undefined,
): VehicleTypeValue | null {
  return value === "bicycle" ||
    value === "moped" ||
    value === "scooter" ||
    value === "car"
    ? value
    : null;
}

function normalizeVerificationStatus(
  value: string | null | undefined,
): VerificationStatusValue {
  return value === "verified" || value === "rejected" ? value : "pending";
}

function normalizeIsoDate(
  value: string | Date | null | undefined,
  fallback = new Date(),
): string {
  return value ? new Date(value).toISOString() : fallback.toISOString();
}

function normalizeAdminNoteEntityType(
  value: string | null | undefined,
): AdminNoteEntityType {
  switch (value) {
    case "user":
    case "executor":
    case "city":
    case "tariff":
    case "promo_code":
      return value;
    case "order":
    default:
      return "order";
  }
}

function normalizeAdminNoteKind(
  value: string | null | undefined,
): AdminNoteKind {
  if (value === "handoff" || value === "escalation") {
    return value;
  }
  return "context";
}

function normalizeAdminNoteState(
  value: string | null | undefined,
): AdminNoteState {
  if (value === "resolved" || value === "archived") {
    return value;
  }
  return "open";
}

function normalizeAdminActivityEntityType(
  value: string | null | undefined,
): AdminActivityEntityType {
  switch (value) {
    case "user":
    case "executor":
    case "city":
    case "tariff":
    case "promo_code":
    case "payment":
      return value;
    case "order":
    default:
      return "order";
  }
}

function normalizeAdminActivityAction(
  value: string | null | undefined,
): AdminActivityAction {
  switch (value) {
    case "city.created":
    case "city.updated":
    case "tariff.created":
    case "tariff.updated":
    case "order.assigned":
    case "order.status_updated":
    case "order.dispatch_retried":
    case "note.created":
    case "note.updated":
    case "user.updated":
    case "executor.updated":
    case "executor.verified":
    case "executor.blocked":
    case "promo_code.created":
    case "promo_code.updated":
    case "payment.refunded":
    case "payment.cancelled":
      return value;
    default:
      return "note.updated";
  }
}

function normalizeUserSnapshot(raw: {
  id: string;
  phone: string;
  name?: string | null;
  preferredLanguage?: string | null;
  preferredCurrency?: string | null;
  bonusBalance?: string | number | null;
  isBlocked?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): UserSnapshot {
  const createdAtValue = raw.createdAt ? new Date(raw.createdAt) : new Date();
  const updatedAtValue = raw.updatedAt
    ? new Date(raw.updatedAt)
    : createdAtValue;

  return {
    id: raw.id,
    phone: raw.phone,
    name: raw.name ?? null,
    preferredLanguage: normalizeLanguage(raw.preferredLanguage),
    preferredCurrency: normalizeCurrency(raw.preferredCurrency),
    bonusBalance: String(raw.bonusBalance ?? "0.00"),
    isBlocked: Boolean(raw.isBlocked),
    createdAt: createdAtValue.toISOString(),
    updatedAt: updatedAtValue.toISOString(),
  };
}

function normalizeCitySnapshot(raw: {
  id: string;
  nameRu?: string | null;
  nameKk?: string | null;
  countryCode?: string | null;
  currency?: string | null;
  timezone?: string | null;
  isActive?: boolean | null;
}): CitySnapshot {
  return {
    id: raw.id,
    nameRu: raw.nameRu ?? "",
    nameKk: raw.nameKk ?? "",
    countryCode: raw.countryCode ?? "",
    currency: normalizeCurrency(raw.currency),
    timezone: raw.timezone ?? "",
    isActive: Boolean(raw.isActive),
  };
}

function normalizeTariffSnapshot(raw: {
  id: string;
  cityId: string;
  serviceType?: string | null;
  vehicleClass?: string | null;
  nameRu?: string | null;
  nameKk?: string | null;
  basePrice?: string | number | null;
  pricePerKm?: string | number | null;
  pricePerMinute?: string | number | null;
  minimumPrice?: string | number | null;
  freeWaitingSeconds?: number | null;
  paidWaitingPerMinute?: string | number | null;
  commissionPercent?: string | number | null;
  commissionFixed?: string | number | null;
  currency?: string | null;
  isActive?: boolean | null;
  validFrom?: string | Date | null;
  validTo?: string | Date | null;
  createdById?: string | null;
}): TariffSnapshot {
  return {
    id: raw.id,
    cityId: raw.cityId,
    serviceType: normalizeServiceType(raw.serviceType),
    vehicleClass: raw.vehicleClass ?? null,
    nameRu: raw.nameRu ?? "",
    nameKk: raw.nameKk ?? "",
    basePrice: String(raw.basePrice ?? "0.00"),
    pricePerKm: String(raw.pricePerKm ?? "0.0000"),
    pricePerMinute: String(raw.pricePerMinute ?? "0.0000"),
    minimumPrice: String(raw.minimumPrice ?? "0.00"),
    freeWaitingSeconds: raw.freeWaitingSeconds ?? 180,
    paidWaitingPerMinute: String(raw.paidWaitingPerMinute ?? "0.0000"),
    commissionPercent: String(raw.commissionPercent ?? "0.00"),
    commissionFixed: String(raw.commissionFixed ?? "0.00"),
    currency: normalizeCurrency(raw.currency),
    isActive: Boolean(raw.isActive),
    validFrom: normalizeIsoDate(raw.validFrom),
    validTo: raw.validTo ? normalizeIsoDate(raw.validTo) : null,
    createdById: raw.createdById ?? null,
  };
}

function normalizePromoCodeSnapshot(raw: {
  id: string;
  code?: string | null;
  discountType?: string | null;
  discountValue?: string | number | null;
  maxUses?: number | null;
  validTo?: string | Date | null;
  isActive?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): PromoCodeSnapshot {
  return {
    id: raw.id,
    code: raw.code ?? "",
    discountType: raw.discountType ?? "fixed",
    discountValue: String(raw.discountValue ?? "0.00"),
    maxUses: raw.maxUses ?? null,
    validTo: raw.validTo ? normalizeIsoDate(raw.validTo) : null,
    isActive: Boolean(raw.isActive),
    createdAt: normalizeIsoDate(raw.createdAt),
    updatedAt: normalizeIsoDate(raw.updatedAt ?? raw.createdAt),
  };
}

function normalizePromoCodeAnalyticsSnapshot(raw: {
  promoCodeId: string;
  code?: string | null;
  totalOrders?: number | null;
  completedOrders?: number | null;
  grossTotalsByCurrency?: Record<string, number> | null;
  discountTotalsByCurrency?: Record<string, number> | null;
  taxiOrders?: number | null;
  deliveryOrders?: number | null;
  uniqueClients?: number | null;
  firstTimeRedemptions?: number | null;
  repeatRedemptions?: number | null;
  usageRate?: number | null;
  completionRate?: number | null;
  firstOrderConversion?: number | null;
  lastRedeemedAt?: string | Date | null;
  cityBreakdown?: Array<{
    cityId: string;
    cityNameRu?: string | null;
    cityNameKk?: string | null;
    orderCount?: number | null;
    completedOrders?: number | null;
    grossTotalsByCurrency?: Record<string, number> | null;
    discountTotalsByCurrency?: Record<string, number> | null;
  }> | null;
  paymentMethodBreakdown?: Array<{
    paymentMethod?: string | null;
    orderCount?: number | null;
    grossTotalsByCurrency?: Record<string, number> | null;
    discountTotalsByCurrency?: Record<string, number> | null;
  }> | null;
  statusBreakdown?: Array<{
    status?: string | null;
    orderCount?: number | null;
    grossTotalsByCurrency?: Record<string, number> | null;
    discountTotalsByCurrency?: Record<string, number> | null;
  }> | null;
}): PromoCodeAnalyticsSnapshot {
  return {
    promoCodeId: raw.promoCodeId,
    code: raw.code ?? null,
    totalOrders: raw.totalOrders ?? 0,
    completedOrders: raw.completedOrders ?? 0,
    grossTotalsByCurrency: raw.grossTotalsByCurrency ?? {},
    discountTotalsByCurrency: raw.discountTotalsByCurrency ?? {},
    taxiOrders: raw.taxiOrders ?? 0,
    deliveryOrders: raw.deliveryOrders ?? 0,
    uniqueClients: raw.uniqueClients ?? 0,
    firstTimeRedemptions: raw.firstTimeRedemptions ?? 0,
    repeatRedemptions: raw.repeatRedemptions ?? 0,
    usageRate:
      raw.usageRate !== undefined && raw.usageRate !== null
        ? Number(raw.usageRate)
        : null,
    completionRate: raw.completionRate ?? 0,
    firstOrderConversion: raw.firstOrderConversion ?? 0,
    lastRedeemedAt: raw.lastRedeemedAt
      ? normalizeIsoDate(raw.lastRedeemedAt)
      : null,
    cityBreakdown: (raw.cityBreakdown ?? []).map((entry) => ({
      cityId: entry.cityId,
      cityNameRu: entry.cityNameRu ?? "",
      cityNameKk: entry.cityNameKk ?? "",
      orderCount: entry.orderCount ?? 0,
      completedOrders: entry.completedOrders ?? 0,
      grossTotalsByCurrency: entry.grossTotalsByCurrency ?? {},
      discountTotalsByCurrency: entry.discountTotalsByCurrency ?? {},
    })),
    paymentMethodBreakdown: (raw.paymentMethodBreakdown ?? [])
      .map((entry) => ({
        paymentMethod: normalizePaymentMethod(entry.paymentMethod),
        orderCount: entry.orderCount ?? 0,
        grossTotalsByCurrency: entry.grossTotalsByCurrency ?? {},
        discountTotalsByCurrency: entry.discountTotalsByCurrency ?? {},
      }))
      .filter(
        (entry): entry is PromoCodeAnalyticsPaymentMethodSnapshot =>
          entry.paymentMethod !== null,
      ),
    statusBreakdown: (raw.statusBreakdown ?? [])
      .map((entry) => ({
        status: normalizeOrderStatus(entry.status),
        orderCount: entry.orderCount ?? 0,
        grossTotalsByCurrency: entry.grossTotalsByCurrency ?? {},
        discountTotalsByCurrency: entry.discountTotalsByCurrency ?? {},
      }))
      .filter(
        (entry): entry is PromoCodeAnalyticsStatusSnapshot =>
          entry.status !== null,
      ),
  };
}

function normalizeExecutorSnapshot(raw: {
  id: string;
  userId: string;
  user?: {
    id: string;
    phone: string;
    name?: string | null;
    preferredLanguage?: string | null;
    preferredCurrency?: string | null;
    bonusBalance?: string | number | null;
    isBlocked?: boolean | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
  } | null;
  executorType?: string | null;
  vehicleType?: string | null;
  carClass?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: string | number | null;
  vehiclePlate?: string | null;
  isOnline?: boolean | null;
  rating?: string | number | null;
  cancelRate?: string | number | null;
  balance?: string | number | null;
  cityId?: string | null;
  city?: {
    id: string;
    nameRu?: string | null;
    nameKk?: string | null;
  } | null;
  verificationStatus?: string | null;
  createdAt?: string | Date | null;
}): ExecutorSnapshot {
  const createdAtValue = raw.createdAt ? new Date(raw.createdAt) : new Date();
  const normalizedUser = raw.user ? normalizeUserSnapshot(raw.user) : null;

  return {
    id: raw.id,
    userId: raw.userId,
    user: normalizedUser,
    executorType: normalizeExecutorType(raw.executorType),
    vehicleType: normalizeVehicleType(raw.vehicleType),
    carClass: raw.carClass ?? null,
    vehicleMake: raw.vehicleMake ?? null,
    vehicleModel: raw.vehicleModel ?? null,
    vehicleYear:
      raw.vehicleYear === null || raw.vehicleYear === undefined
        ? null
        : Number(raw.vehicleYear),
    vehiclePlate: raw.vehiclePlate ?? null,
    isOnline: Boolean(raw.isOnline),
    rating: String(raw.rating ?? "0.00"),
    cancelRate: String(raw.cancelRate ?? "0.00"),
    balance: String(raw.balance ?? "0.00"),
    cityId: raw.cityId ?? raw.city?.id ?? null,
    cityNameRu: raw.city?.nameRu ?? null,
    cityNameKk: raw.city?.nameKk ?? null,
    verificationStatus: normalizeVerificationStatus(raw.verificationStatus),
    isBlocked: Boolean(normalizedUser?.isBlocked),
    createdAt: createdAtValue.toISOString(),
  };
}

function normalizeOrderPartySnapshot(raw: {
  id: string;
  name?: string | null;
  phone?: string | null;
  isBlocked?: boolean | null;
}): AdminOrderPartySnapshot {
  return {
    id: raw.id,
    name: raw.name ?? null,
    phone: raw.phone ?? "",
    isBlocked: Boolean(raw.isBlocked),
  };
}

function normalizeOrderExecutorPartySnapshot(raw: {
  id: string;
  userId: string;
  name?: string | null;
  phone?: string | null;
  isBlocked?: boolean | null;
  executorType?: string | null;
  vehicleType?: string | null;
  carClass?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: string | number | null;
  vehiclePlate?: string | null;
  isOnline?: boolean | null;
  verificationStatus?: string | null;
}): AdminOrderExecutorPartySnapshot {
  return {
    ...normalizeOrderPartySnapshot(raw),
    userId: raw.userId,
    executorType: normalizeExecutorType(raw.executorType),
    vehicleType: normalizeVehicleType(raw.vehicleType),
    carClass: raw.carClass ?? null,
    vehicleMake: raw.vehicleMake ?? null,
    vehicleModel: raw.vehicleModel ?? null,
    vehicleYear:
      raw.vehicleYear === null || raw.vehicleYear === undefined
        ? null
        : Number(raw.vehicleYear),
    vehiclePlate: raw.vehiclePlate ?? null,
    isOnline: Boolean(raw.isOnline),
    verificationStatus: normalizeVerificationStatus(raw.verificationStatus),
  };
}

function normalizeAdminOrderSnapshot(raw: {
  id: string;
  serviceType?: string | null;
  status?: string | null;
  clientId: string;
  executorId?: string | null;
  cityId: string;
  currency?: string | null;
  paymentMethod?: string | null;
  estimatedPrice?: string | number | null;
  finalPrice?: string | number | null;
  discountAmount?: string | number | null;
  promoCodeId?: string | null;
  promoCodeCode?: string | null;
  pickupAddress?: string | null;
  destinationAddress?: string | null;
  deliveryStatus?: string | null;
  createdAt?: string | Date | null;
  scheduledAt?: string | Date | null;
}): AdminOrderSnapshot {
  return {
    id: raw.id,
    serviceType: normalizeServiceType(raw.serviceType),
    status: normalizeOrderStatus(raw.status),
    clientId: raw.clientId,
    executorId: raw.executorId ?? null,
    cityId: raw.cityId,
    currency: normalizeCurrency(raw.currency),
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    estimatedPrice:
      raw.estimatedPrice !== undefined && raw.estimatedPrice !== null
        ? String(raw.estimatedPrice)
        : null,
    finalPrice:
      raw.finalPrice !== undefined && raw.finalPrice !== null
        ? String(raw.finalPrice)
        : null,
    discountAmount: String(raw.discountAmount ?? "0.00"),
    promoCodeId: raw.promoCodeId ?? null,
    promoCodeCode: raw.promoCodeCode ?? null,
    pickupAddress: raw.pickupAddress ?? null,
    destinationAddress: raw.destinationAddress ?? null,
    deliveryStatus: raw.deliveryStatus
      ? normalizeDeliveryStatus(raw.deliveryStatus)
      : null,
    createdAt: normalizeIsoDate(raw.createdAt),
    scheduledAt: raw.scheduledAt ? normalizeIsoDate(raw.scheduledAt) : null,
  };
}

function normalizeOrderDetailSnapshot(raw: {
  id: string;
  serviceType?: string | null;
  status?: string | null;
  clientId: string;
  executorId?: string | null;
  cityId: string;
  currency?: string | null;
  paymentMethod?: string | null;
  estimatedPrice?: string | number | null;
  finalPrice?: string | number | null;
  promoCodeId?: string | null;
  promoCodeCode?: string | null;
  pickupAddress?: string | null;
  destinationAddress?: string | null;
  deliveryStatus?: string | null;
  createdAt?: string | Date | null;
  scheduledAt?: string | Date | null;
  client?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    isBlocked?: boolean | null;
  } | null;
  executor?: {
    id: string;
    userId: string;
    name?: string | null;
    phone?: string | null;
    isBlocked?: boolean | null;
    executorType?: string | null;
    vehicleType?: string | null;
    carClass?: string | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleYear?: string | number | null;
    vehiclePlate?: string | null;
    isOnline?: boolean | null;
    verificationStatus?: string | null;
  } | null;
  city?: {
    id: string;
    nameRu?: string | null;
    nameKk?: string | null;
    currency?: string | null;
  } | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  discountAmount?: string | number | null;
  acceptedAt?: string | Date | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  cancelReason?: string | null;
  clientRating?: number | null;
  executorRating?: number | null;
  updatedAt?: string | Date | null;
  routePoints?: Array<{
    id: string;
    sequenceIndex?: number | null;
    lat?: number | null;
    lng?: number | null;
    address?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    arrivedAt?: string | Date | null;
    completedAt?: string | Date | null;
    notes?: string | null;
  }>;
  delivery?: {
    courierVehicleType?: string | null;
    packageDescription?: string | null;
    packagePhotoUrl?: string | null;
    declaredValue?: string | number | null;
    isFragile?: boolean | null;
    requiresReturn?: boolean | null;
    cashOnDelivery?: string | number | null;
    deliveryStatus?: string | null;
    proofPhotoUrl?: string | null;
    proofSignatureUrl?: string | null;
    recipientCode?: string | null;
    updatedAt?: string | Date | null;
  } | null;
  payments?: Array<{
    id: string;
    status?: string | null;
    method?: string | null;
    amount?: string | number | null;
    currency?: string | null;
    provider?: string | null;
    providerTransactionId?: string | null;
    refundedAmount?: string | number | null;
    capturedAt?: string | Date | null;
    createdAt?: string | Date | null;
  }>;
  statusEvents?: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    actorId?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt?: string | Date | null;
  }>;
}): AdminOrderDetailSnapshot {
  const createdAt = normalizeIsoDate(raw.createdAt);
  const updatedAt = normalizeIsoDate(raw.updatedAt, new Date(createdAt));

  return {
    id: raw.id,
    serviceType: normalizeServiceType(raw.serviceType),
    status: normalizeOrderStatus(raw.status),
    clientId: raw.clientId,
    executorId: raw.executorId ?? null,
    cityId: raw.cityId,
    currency: normalizeCurrency(raw.currency),
    paymentMethod: normalizePaymentMethod(raw.paymentMethod),
    estimatedPrice:
      raw.estimatedPrice !== undefined && raw.estimatedPrice !== null
        ? String(raw.estimatedPrice)
        : null,
    finalPrice:
      raw.finalPrice !== undefined && raw.finalPrice !== null
        ? String(raw.finalPrice)
        : null,
    promoCodeId: raw.promoCodeId ?? null,
    promoCodeCode: raw.promoCodeCode ?? null,
    pickupAddress: raw.pickupAddress ?? null,
    destinationAddress: raw.destinationAddress ?? null,
    deliveryStatus: raw.deliveryStatus
      ? normalizeDeliveryStatus(raw.deliveryStatus)
      : null,
    createdAt,
    scheduledAt: raw.scheduledAt ? normalizeIsoDate(raw.scheduledAt) : null,
    client: raw.client ? normalizeOrderPartySnapshot(raw.client) : null,
    executor: raw.executor
      ? normalizeOrderExecutorPartySnapshot(raw.executor)
      : null,
    city: raw.city
      ? {
          id: raw.city.id,
          nameRu: raw.city.nameRu ?? "",
          nameKk: raw.city.nameKk ?? "",
          currency: normalizeCurrency(raw.city.currency),
        }
      : null,
    distanceMeters: raw.distanceMeters ?? null,
    durationSeconds: raw.durationSeconds ?? null,
    discountAmount: String(raw.discountAmount ?? "0.00"),
    acceptedAt: raw.acceptedAt ? normalizeIsoDate(raw.acceptedAt) : null,
    startedAt: raw.startedAt ? normalizeIsoDate(raw.startedAt) : null,
    completedAt: raw.completedAt ? normalizeIsoDate(raw.completedAt) : null,
    cancelledAt: raw.cancelledAt ? normalizeIsoDate(raw.cancelledAt) : null,
    cancelReason: raw.cancelReason ?? null,
    clientRating: raw.clientRating ?? null,
    executorRating: raw.executorRating ?? null,
    updatedAt,
    routePoints: (raw.routePoints ?? []).map((point) => ({
      id: point.id,
      sequenceIndex: point.sequenceIndex ?? 0,
      lat: point.lat ?? 0,
      lng: point.lng ?? 0,
      address: point.address ?? "",
      contactName: point.contactName ?? null,
      contactPhone: point.contactPhone ?? null,
      arrivedAt: point.arrivedAt ? normalizeIsoDate(point.arrivedAt) : null,
      completedAt: point.completedAt
        ? normalizeIsoDate(point.completedAt)
        : null,
      notes: point.notes ?? null,
    })),
    delivery: raw.delivery
      ? {
          courierVehicleType:
            normalizeVehicleType(raw.delivery.courierVehicleType) ?? "car",
          packageDescription: raw.delivery.packageDescription ?? null,
          packagePhotoUrl: raw.delivery.packagePhotoUrl ?? null,
          declaredValue:
            raw.delivery.declaredValue !== undefined &&
            raw.delivery.declaredValue !== null
              ? String(raw.delivery.declaredValue)
              : null,
          isFragile: Boolean(raw.delivery.isFragile),
          requiresReturn: Boolean(raw.delivery.requiresReturn),
          cashOnDelivery:
            raw.delivery.cashOnDelivery !== undefined &&
            raw.delivery.cashOnDelivery !== null
              ? String(raw.delivery.cashOnDelivery)
              : null,
          deliveryStatus: normalizeDeliveryStatus(raw.delivery.deliveryStatus),
          proofPhotoUrl: raw.delivery.proofPhotoUrl ?? null,
          proofSignatureUrl: raw.delivery.proofSignatureUrl ?? null,
          recipientCode: raw.delivery.recipientCode ?? null,
          updatedAt: normalizeIsoDate(
            raw.delivery.updatedAt,
            new Date(updatedAt),
          ),
        }
      : null,
    payments: (raw.payments ?? []).map((payment) => ({
      id: payment.id,
      status: normalizePaymentStatus(payment.status),
      method: normalizePaymentMethod(payment.method),
      amount: String(payment.amount ?? "0.00"),
      currency: normalizeCurrency(payment.currency),
      provider: payment.provider ?? null,
      providerTransactionId: payment.providerTransactionId ?? null,
      refundedAmount: String(payment.refundedAmount ?? "0.00"),
      capturedAt: payment.capturedAt
        ? normalizeIsoDate(payment.capturedAt)
        : null,
      createdAt: normalizeIsoDate(payment.createdAt, new Date(createdAt)),
    })),
    statusEvents: (raw.statusEvents ?? []).map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus
        ? normalizeOrderStatus(event.fromStatus)
        : null,
      toStatus: normalizeOrderStatus(event.toStatus),
      actorId: event.actorId ?? null,
      metadata: event.metadata ?? null,
      createdAt: normalizeIsoDate(event.createdAt, new Date(createdAt)),
    })),
  };
}

function normalizeAdminNoteSnapshot(raw: {
  id: string;
  entityType?: string | null;
  entityId: string;
  body?: string | null;
  kind?: string | null;
  isPinned?: boolean | null;
  state?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  createdAt?: string | Date | null;
  resolvedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): AdminNoteSnapshot {
  return {
    id: raw.id,
    entityType: normalizeAdminNoteEntityType(raw.entityType),
    entityId: raw.entityId,
    body: raw.body?.trim() || "",
    kind: normalizeAdminNoteKind(raw.kind),
    isPinned: raw.isPinned ?? false,
    state: normalizeAdminNoteState(raw.state),
    createdById: raw.createdById ?? null,
    createdByName: raw.createdByName ?? null,
    assignedToId: raw.assignedToId ?? null,
    assignedToName: raw.assignedToName ?? null,
    createdAt: normalizeIsoDate(raw.createdAt),
    resolvedAt: raw.resolvedAt ? normalizeIsoDate(raw.resolvedAt) : null,
    archivedAt: raw.archivedAt ? normalizeIsoDate(raw.archivedAt) : null,
    updatedAt: normalizeIsoDate(raw.updatedAt ?? raw.createdAt),
  };
}

function normalizeAdminActivitySnapshot(raw: {
  id: string;
  action?: string | null;
  entityType?: string | null;
  entityId: string;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | Date | null;
}): AdminActivitySnapshot {
  return {
    id: raw.id,
    action: normalizeAdminActivityAction(raw.action),
    entityType: normalizeAdminActivityEntityType(raw.entityType),
    entityId: raw.entityId,
    actorId: raw.actorId ?? null,
    actorName: raw.actorName ?? null,
    metadata: raw.metadata ?? null,
    createdAt: normalizeIsoDate(raw.createdAt),
  };
}

function formatLoadFailure(scope: string, reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason);
  return `Failed to load ${scope}: ${message}`;
}

function resolveSettled<T>(
  scope: string,
  result: PromiseSettledResult<T>,
  fallback: T,
  warnings: string[],
): { value: T; fulfilled: boolean } {
  if (result.status === "fulfilled") {
    return {
      value: result.value,
      fulfilled: true,
    };
  }

  warnings.push(formatLoadFailure(scope, result.reason));

  return {
    value: fallback,
    fulfilled: false,
  };
}

function normalizeExecutorBalanceTopUpSnapshot(raw: {
  id: string;
  executorId?: string | null;
  executor?: {
    id?: string | null;
    user?: {
      phone?: string | null;
      name?: string | null;
    } | null;
  } | null;
  amount?: string | number | null;
  phone?: string | null;
  status?: string | null;
  invoiceProvider?: string | null;
  adminComment?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}): ExecutorBalanceTopUpSnapshot {
  const status =
    raw.status === "invoiced" ||
    raw.status === "confirmed" ||
    raw.status === "rejected"
      ? raw.status
      : "pending";
  return {
    id: raw.id,
    executorId: raw.executorId ?? raw.executor?.id ?? "",
    executorName: raw.executor?.user?.name ?? null,
    executorPhone: raw.executor?.user?.phone ?? null,
    amount: String(raw.amount ?? "0.00"),
    phone: raw.phone ?? "",
    status,
    invoiceProvider: raw.invoiceProvider ?? "kaspi",
    adminComment: raw.adminComment ?? null,
    createdAt: raw.createdAt
      ? new Date(raw.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: raw.updatedAt
      ? new Date(raw.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}

function normalizeExecutorPayoutSnapshot(raw: {
  id: string;
  executorId?: string | null;
  executor?: {
    id?: string | null;
    user?: {
      phone?: string | null;
      name?: string | null;
    } | null;
  } | null;
  amount?: string | number | null;
  status?: string | null;
  method?: string | null;
  adminComment?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  paidAt?: string | Date | null;
}): ExecutorPayoutSnapshot {
  const status =
    raw.status === "paid" || raw.status === "rejected"
      ? raw.status
      : "pending";
  const method =
    raw.method === "halyk" || raw.method === "cash" ? raw.method : "kaspi";
  return {
    id: raw.id,
    executorId: raw.executorId ?? raw.executor?.id ?? "",
    executorName: raw.executor?.user?.name ?? null,
    executorPhone: raw.executor?.user?.phone ?? null,
    amount: String(raw.amount ?? "0.00"),
    status,
    method,
    adminComment: raw.adminComment ?? null,
    createdAt: raw.createdAt
      ? new Date(raw.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: raw.updatedAt
      ? new Date(raw.updatedAt).toISOString()
      : new Date().toISOString(),
    paidAt: raw.paidAt ? new Date(raw.paidAt).toISOString() : null,
  };
}

function buildQueryString(
  query: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") {
      continue;
    }
    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function resolvePeriodDateRange(
  period: ReportsSnapshotQuery["period"] | undefined,
  anchorDate = new Date(),
): { from: string; to: string } | null {
  if (!period) {
    return null;
  }

  const to = new Date(anchorDate);
  const from = new Date(anchorDate);

  switch (period) {
    case "day":
      from.setDate(to.getDate() - 1);
      break;
    case "week":
      from.setDate(to.getDate() - 7);
      break;
    case "month":
      from.setMonth(to.getMonth() - 1);
      break;
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function encodeAdminOrderCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), "utf8").toString(
    "base64url",
  );
}

function decodeAdminOrderCursor(
  cursor: string,
): { createdAt: string; id: string } | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as {
      createdAt?: unknown;
      id?: unknown;
    };

    return typeof decoded.createdAt === "string" &&
      typeof decoded.id === "string"
      ? {
          createdAt: decoded.createdAt,
          id: decoded.id,
        }
      : null;
  } catch {
    return null;
  }
}

function isAdminOrderBeforeCursor(
  order: AdminOrderSnapshot,
  cursorCreatedAt: string,
  cursorId: string,
): boolean {
  const orderCreatedAt = new Date(order.createdAt).getTime();
  const cursorCreatedAtMs = new Date(cursorCreatedAt).getTime();

  return (
    orderCreatedAt < cursorCreatedAtMs ||
    (orderCreatedAt === cursorCreatedAtMs && order.id < cursorId)
  );
}

function filterDemoUsers(query: UsersSnapshotQuery): UserSnapshot[] {
  return DEMO_USERS.filter((user) => {
    if (
      query.preferredLanguage &&
      user.preferredLanguage !== query.preferredLanguage
    ) {
      return false;
    }
    if (query.isBlocked !== undefined && user.isBlocked !== query.isBlocked) {
      return false;
    }
    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      const haystack = [user.name, user.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  }).slice(0, query.limit ?? 100);
}

function filterDemoExecutors(
  query: ExecutorsSnapshotQuery,
): ExecutorSnapshot[] {
  return DEMO_EXECUTORS.filter((executor) => {
    if (query.cityId && executor.cityId !== query.cityId) {
      return false;
    }
    if (query.executorType && executor.executorType !== query.executorType) {
      return false;
    }
    if (query.vehicleType && executor.vehicleType !== query.vehicleType) {
      return false;
    }
    if (
      query.verificationStatus &&
      executor.verificationStatus !== query.verificationStatus
    ) {
      return false;
    }
    if (query.isOnline !== undefined && executor.isOnline !== query.isOnline) {
      return false;
    }
    if (
      query.isBlocked !== undefined &&
      executor.isBlocked !== query.isBlocked
    ) {
      return false;
    }
    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      const haystack = [executor.id, executor.user?.name, executor.user?.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  }).slice(0, query.limit ?? 100);
}

function filterDemoAdminNotes(
  query: AdminNotesQuery = {},
): AdminNoteSnapshot[] {
  return DEMO_ADMIN_NOTES.filter((note) => {
    if (query.entityType && note.entityType !== query.entityType) {
      return false;
    }
    if (query.entityId && note.entityId !== query.entityId) {
      return false;
    }
    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      const haystack = [note.id, note.body, note.entityId]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    if (query.authorQuery) {
      const normalizedAuthorQuery = query.authorQuery.trim().toLowerCase();
      const haystack = [note.createdByName, note.createdById]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedAuthorQuery)) {
        return false;
      }
    }
    if (query.assignedToId && note.assignedToId !== query.assignedToId) {
      return false;
    }
    if (query.assigneeQuery) {
      const normalizedAssigneeQuery = query.assigneeQuery.trim().toLowerCase();
      const haystack = [note.assignedToName, note.assignedToId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedAssigneeQuery)) {
        return false;
      }
    }
    if (
      typeof query.hasAssignee === "boolean" &&
      (query.hasAssignee ? !note.assignedToId : Boolean(note.assignedToId))
    ) {
      return false;
    }
    if (query.kind && note.kind !== query.kind) {
      return false;
    }
    if (
      typeof query.isPinned === "boolean" &&
      note.isPinned !== query.isPinned
    ) {
      return false;
    }
    if (query.state && note.state !== query.state) {
      return false;
    }
    return true;
  })
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) {
        return left.isPinned ? -1 : 1;
      }
      const stateOrder = {
        open: 0,
        resolved: 1,
        archived: 2,
      } as const;
      if (stateOrder[left.state] !== stateOrder[right.state]) {
        return stateOrder[left.state] - stateOrder[right.state];
      }
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, query.limit ?? 100);
}

function filterDemoAdminActivity(
  query: AdminActivityQuery = {},
): AdminActivitySnapshot[] {
  const now = Date.now();
  return DEMO_ADMIN_ACTIVITY.filter((entry) => {
    if (query.entityType && entry.entityType !== query.entityType) {
      return false;
    }
    if (query.entityId && entry.entityId !== query.entityId) {
      return false;
    }
    if (query.action && entry.action !== query.action) {
      return false;
    }
    if (query.group) {
      const matchesGroup =
        query.group === "order"
          ? entry.action.startsWith("order.")
          : query.group === "payment"
            ? entry.action.startsWith("payment.")
            : query.group === "note"
              ? entry.action.startsWith("note.")
              : entry.action.startsWith("user.") ||
                entry.action.startsWith("executor.") ||
                entry.action.startsWith("city.") ||
                entry.action.startsWith("tariff.") ||
                entry.action.startsWith("promo_code.");
      if (!matchesGroup) {
        return false;
      }
    }
    if (query.window) {
      const ageMs = Math.max(0, now - new Date(entry.createdAt).getTime());
      const matchesWindow =
        query.window === "hour"
          ? ageMs <= 60 * 60 * 1000
          : query.window === "day"
            ? ageMs <= 24 * 60 * 60 * 1000
            : ageMs <= 7 * 24 * 60 * 60 * 1000;
      if (!matchesWindow) {
        return false;
      }
    }
    if (query.actorId && entry.actorId !== query.actorId) {
      return false;
    }
    if (query.actorQuery) {
      const normalizedActorQuery = query.actorQuery.trim().toLowerCase();
      const haystack = [entry.actorName, entry.actorId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedActorQuery)) {
        return false;
      }
    }
    if (query.query) {
      const normalizedQuery = query.query.trim().toLowerCase();
      const haystack = [
        entry.action,
        entry.entityId,
        entry.actorName,
        JSON.stringify(entry.metadata ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, query.limit ?? 100);
}

function filterDemoOrders(query: AdminOrdersQuery = {}): AdminOrdersSnapshot {
  const normalizedLimit = Math.min(query.limit ?? 20, 50);
  const demoAnchorDate = DEMO_ORDERS.reduce<Date>((latest, order) => {
    const createdAt = new Date(order.createdAt);
    return createdAt > latest ? createdAt : latest;
  }, new Date(0));
  const periodRange =
    !query.dateFrom && !query.dateTo
      ? resolvePeriodDateRange(query.period, demoAnchorDate)
      : null;
  const dateFrom = query.dateFrom ?? periodRange?.from;
  const dateTo = query.dateTo ?? periodRange?.to;
  const filtered = DEMO_ORDERS.filter((order) => {
    if (query.status && order.status !== query.status) {
      return false;
    }
    if (query.serviceType && order.serviceType !== query.serviceType) {
      return false;
    }
    if (query.paymentMethod && order.paymentMethod !== query.paymentMethod) {
      return false;
    }
    if (query.promoCodeId && order.promoCodeId !== query.promoCodeId) {
      return false;
    }
    if (query.cityId && order.cityId !== query.cityId) {
      return false;
    }
    if (dateFrom && new Date(order.createdAt) < new Date(dateFrom)) {
      return false;
    }
    if (dateTo && new Date(order.createdAt) > new Date(dateTo)) {
      return false;
    }
    if (query.cursor) {
      const cursor = decodeAdminOrderCursor(query.cursor);
      if (
        cursor &&
        !isAdminOrderBeforeCursor(order, cursor.createdAt, cursor.id)
      ) {
        return false;
      }
    }
    return true;
  }).sort(
    (left, right) =>
      new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime() || right.id.localeCompare(left.id),
  );

  const pageItems = filtered.slice(0, normalizedLimit);
  const hasNextPage = filtered.length > normalizedLimit;
  const lastItem = pageItems.at(-1) ?? null;

  return {
    items: pageItems,
    nextCursor:
      hasNextPage && lastItem
        ? encodeAdminOrderCursor(lastItem.createdAt, lastItem.id)
        : null,
  };
}

function filterDemoOperations(query: ReportsSnapshotQuery): OperationsSnapshot {
  const orders = DEMO_ORDERS.filter((order) =>
    query.cityId ? order.cityId === query.cityId : true,
  );
  const executors = DEMO_EXECUTORS.filter((executor) =>
    query.cityId ? executor.cityId === query.cityId : true,
  );
  const ordersByStatus = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const ordersByServiceType = orders.reduce<Record<string, number>>(
    (acc, order) => {
      acc[order.serviceType] = (acc[order.serviceType] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return {
    ...DEMO_OPERATIONS,
    period: query.period ?? DEMO_OPERATIONS.period,
    cityId: query.cityId ?? null,
    totalOrders: orders.length,
    ordersByStatus,
    ordersByServiceType,
    activeExecutors: executors.filter((executor) => executor.isOnline).length,
    verifiedExecutors: executors.filter(
      (executor) => executor.verificationStatus === "verified",
    ).length,
  };
}

function filterDemoFinancial(query: ReportsSnapshotQuery): FinancialSnapshot {
  const hasDemoCityScope = !query.cityId || query.cityId === "city-almaty";

  return {
    ...DEMO_FINANCIAL,
    period: query.period ?? DEMO_FINANCIAL.period,
    cityId: query.cityId ?? null,
    paymentsCount: hasDemoCityScope ? DEMO_FINANCIAL.paymentsCount : 0,
    completedOrdersCount: hasDemoCityScope
      ? DEMO_FINANCIAL.completedOrdersCount
      : 0,
    capturedAmountByCurrency: hasDemoCityScope
      ? DEMO_FINANCIAL.capturedAmountByCurrency
      : { KZT: 0, RUB: 0 },
    refundedAmountByCurrency: hasDemoCityScope
      ? DEMO_FINANCIAL.refundedAmountByCurrency
      : { KZT: 0, RUB: 0 },
  };
}

function offsetIsoDate(value: string, minutes: number): string {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

function buildDemoRoutePoints(
  order: AdminOrderSnapshot,
): AdminOrderRoutePointSnapshot[] {
  const orderSeed = Number(order.id.split("-").at(-1) ?? "0");
  const baseLat = 43.2389 + (orderSeed - 200) * 0.0014;
  const baseLng = 76.8897 + (orderSeed - 200) * 0.0011;

  return [
    {
      id: `${order.id}-point-0`,
      sequenceIndex: 0,
      lat: Number(baseLat.toFixed(6)),
      lng: Number(baseLng.toFixed(6)),
      address: order.pickupAddress ?? "",
      contactName: null,
      contactPhone: null,
      arrivedAt: ["waiting", "in_progress", "completed"].includes(order.status)
        ? offsetIsoDate(order.createdAt, 9)
        : null,
      completedAt: ["in_progress", "completed"].includes(order.status)
        ? offsetIsoDate(order.createdAt, 11)
        : null,
      notes: null,
    },
    {
      id: `${order.id}-point-1`,
      sequenceIndex: 1,
      lat: Number((baseLat + 0.024).toFixed(6)),
      lng: Number((baseLng + 0.017).toFixed(6)),
      address: order.destinationAddress ?? "",
      contactName: null,
      contactPhone: null,
      arrivedAt:
        order.status === "completed"
          ? offsetIsoDate(order.createdAt, 26)
          : null,
      completedAt:
        order.status === "completed"
          ? offsetIsoDate(order.createdAt, 28)
          : null,
      notes: null,
    },
  ];
}

function buildDemoStatusEvents(
  order: AdminOrderSnapshot,
  acceptedAt: string | null,
  startedAt: string | null,
  completedAt: string | null,
  cancelledAt: string | null,
): AdminOrderStatusEventSnapshot[] {
  const events: AdminOrderStatusEventSnapshot[] = [
    {
      id: `${order.id}-event-searching`,
      fromStatus: "draft",
      toStatus: "searching",
      actorId: order.clientId,
      metadata: {
        source: "client_app",
      },
      createdAt: order.createdAt,
    },
  ];

  if (acceptedAt) {
    events.push({
      id: `${order.id}-event-accepted`,
      fromStatus: "searching",
      toStatus: "accepted",
      actorId: order.executorId,
      metadata: {
        source: "dispatch",
      },
      createdAt: acceptedAt,
    });
  }

  if (
    acceptedAt &&
    ["arriving", "waiting", "in_progress", "completed"].includes(order.status)
  ) {
    events.push({
      id: `${order.id}-event-arriving`,
      fromStatus: "accepted",
      toStatus: "arriving",
      actorId: order.executorId,
      metadata: null,
      createdAt: offsetIsoDate(acceptedAt, 2),
    });
  }

  if (
    acceptedAt &&
    ["waiting", "in_progress", "completed"].includes(order.status)
  ) {
    events.push({
      id: `${order.id}-event-waiting`,
      fromStatus: "arriving",
      toStatus: "waiting",
      actorId: order.executorId,
      metadata: null,
      createdAt: offsetIsoDate(acceptedAt, 5),
    });
  }

  if (startedAt) {
    events.push({
      id: `${order.id}-event-progress`,
      fromStatus: "waiting",
      toStatus: "in_progress",
      actorId: order.executorId,
      metadata: null,
      createdAt: startedAt,
    });
  }

  if (completedAt) {
    events.push({
      id: `${order.id}-event-completed`,
      fromStatus: "in_progress",
      toStatus: "completed",
      actorId: order.executorId,
      metadata: {
        source: order.serviceType,
      },
      createdAt: completedAt,
    });
  }

  if (cancelledAt && order.status.startsWith("cancelled")) {
    events.push({
      id: `${order.id}-event-cancelled`,
      fromStatus: acceptedAt ? "searching" : "draft",
      toStatus: order.status,
      actorId: order.clientId,
      metadata: null,
      createdAt: cancelledAt,
    });
  }

  return events;
}

function buildDemoOrderDetail(
  orderId: string,
): AdminOrderDetailSnapshot | null {
  const order = DEMO_ORDERS.find((item) => item.id === orderId);
  if (!order) {
    return null;
  }

  const client = DEMO_USERS.find((item) => item.id === order.clientId) ?? null;
  const executor = order.executorId
    ? (DEMO_EXECUTORS.find((item) => item.id === order.executorId) ?? null)
    : null;
  const city = DEMO_CITIES.find((item) => item.id === order.cityId) ?? null;
  const acceptedAt =
    order.status === "searching" ? null : offsetIsoDate(order.createdAt, 4);
  const startedAt = ["in_progress", "completed"].includes(order.status)
    ? offsetIsoDate(order.createdAt, 12)
    : null;
  const completedAt =
    order.status === "completed" ? offsetIsoDate(order.createdAt, 28) : null;
  const cancelledAt = order.status.startsWith("cancelled")
    ? offsetIsoDate(order.createdAt, 10)
    : null;
  const updatedAt =
    completedAt ??
    cancelledAt ??
    startedAt ??
    acceptedAt ??
    offsetIsoDate(order.createdAt, 1);
  const deliveryVehicleType =
    executor?.vehicleType ?? (order.serviceType === "delivery" ? "car" : null);

  return {
    ...order,
    client: client
      ? {
          id: client.id,
          name: client.name,
          phone: client.phone,
          isBlocked: client.isBlocked,
        }
      : null,
    executor: executor
      ? {
          id: executor.id,
          userId: executor.userId,
          name: executor.user?.name ?? null,
          phone: executor.user?.phone ?? "",
          isBlocked: executor.isBlocked,
          executorType: executor.executorType,
          vehicleType: executor.vehicleType,
          carClass: executor.carClass,
          vehicleMake: executor.vehicleMake,
          vehicleModel: executor.vehicleModel,
          vehicleYear: executor.vehicleYear,
          vehiclePlate: executor.vehiclePlate,
          isOnline: executor.isOnline,
          verificationStatus: executor.verificationStatus,
        }
      : null,
    city: city
      ? {
          id: city.id,
          nameRu: city.nameRu,
          nameKk: city.nameKk,
          currency: city.currency,
        }
      : null,
    distanceMeters:
      order.serviceType === "delivery"
        ? 5300 + Number(order.id.slice(-1)) * 220
        : 8700 + Number(order.id.slice(-1)) * 310,
    durationSeconds:
      order.serviceType === "delivery"
        ? 18 * 60 + Number(order.id.slice(-1)) * 35
        : 24 * 60 + Number(order.id.slice(-1)) * 40,
    discountAmount: order.id === "order-205" ? "150.00" : "0.00",
    acceptedAt,
    startedAt,
    completedAt,
    cancelledAt,
    cancelReason: null,
    clientRating: order.status === "completed" ? 5 : null,
    executorRating: order.status === "completed" ? 5 : null,
    updatedAt,
    routePoints: buildDemoRoutePoints(order),
    delivery:
      order.serviceType === "delivery" && deliveryVehicleType
        ? {
            courierVehicleType: deliveryVehicleType,
            packageDescription: null,
            packagePhotoUrl: null,
            declaredValue: "5000.00",
            isFragile: order.id === "order-204",
            requiresReturn: order.id === "order-203",
            cashOnDelivery: order.id === "order-204" ? "2000.00" : null,
            deliveryStatus: order.deliveryStatus ?? "pending_pickup",
            proofPhotoUrl:
              order.status === "completed"
                ? "https://example.com/proof-photo.jpg"
                : null,
            proofSignatureUrl: null,
            recipientCode: order.status === "completed" ? "4821" : "7263",
            updatedAt,
          }
        : null,
    payments:
      order.paymentMethod === "cash"
        ? []
        : [
            {
              id: `${order.id}-payment-1`,
              status: order.status === "completed" ? "captured" : "pending",
              method: order.paymentMethod,
              amount: order.finalPrice ?? order.estimatedPrice ?? "0.00",
              currency: order.currency,
              provider: "dev-stub",
              providerTransactionId: `${order.id}-txn`,
              refundedAmount: "0.00",
              capturedAt: order.status === "completed" ? completedAt : null,
              createdAt: offsetIsoDate(order.createdAt, 1),
            },
          ],
    statusEvents: buildDemoStatusEvents(
      order,
      acceptedAt,
      startedAt,
      completedAt,
      cancelledAt,
    ),
  };
}

export async function getBackofficeSnapshot(): Promise<BackofficeSnapshot> {
  const {
    apiBaseUrl,
    apiToken,
    warnings: envWarnings,
  } = resolveAdminRuntimeConfig();
  const demoSnapshot = createDemoSnapshot();

  if (!apiToken || envWarnings.includes("ADMIN_API_URL_INVALID")) {
    return {
      ...demoSnapshot,
      sourceLabel: apiBaseUrl,
      warnings: Array.from(new Set([...demoSnapshot.warnings, ...envWarnings])),
    };
  }

  const [
    citiesResult,
    tariffsResult,
    ordersResult,
    financialResult,
    operationsResult,
  ] = await Promise.allSettled([
    fetchAdminJson<Array<Parameters<typeof normalizeCitySnapshot>[0]>>(
      "admin/cities",
      apiBaseUrl,
      apiToken,
    ),
    fetchAdminJson<Array<Parameters<typeof normalizeTariffSnapshot>[0]>>(
      "admin/tariffs",
      apiBaseUrl,
      apiToken,
    ),
    fetchAdminJson<AdminOrdersResponse>("admin/orders", apiBaseUrl, apiToken),
    fetchAdminJson<FinancialSnapshot>(
      "admin/reports/financial?period=day",
      apiBaseUrl,
      apiToken,
    ),
    fetchAdminJson<OperationsSnapshot>(
      "admin/reports/operations?period=day",
      apiBaseUrl,
      apiToken,
    ),
  ]);

  const warnings: string[] = [];
  const cities = resolveSettled(
    "cities",
    citiesResult,
    demoSnapshot.cities,
    warnings,
  );
  const tariffs = resolveSettled(
    "tariffs",
    tariffsResult,
    demoSnapshot.tariffs,
    warnings,
  );
  const orders = resolveSettled(
    "orders",
    ordersResult,
    {
      items: demoSnapshot.orders,
      nextCursor: null,
    },
    warnings,
  );
  const financial = resolveSettled(
    "financial report",
    financialResult,
    demoSnapshot.financial,
    warnings,
  );
  const operations = resolveSettled(
    "operations report",
    operationsResult,
    demoSnapshot.operations,
    warnings,
  );
  const fulfilled = [
    cities.fulfilled,
    tariffs.fulfilled,
    orders.fulfilled,
    financial.fulfilled,
    operations.fulfilled,
  ].filter(Boolean).length;

  return {
    mode: fulfilled === 5 ? "live" : fulfilled > 0 ? "mixed" : "demo",
    sourceLabel: apiBaseUrl,
    generatedAt: new Date().toISOString(),
    warnings: Array.from(new Set([...envWarnings, ...warnings])),
    cities: cities.value.map((item) => normalizeCitySnapshot(item)),
    tariffs: tariffs.value.map((item) => normalizeTariffSnapshot(item)),
    orders: orders.value.items.map((item) => normalizeAdminOrderSnapshot(item)),
    financial: financial.value,
    operations: operations.value,
  };
}

export async function getDispatchSettingsSnapshot(): Promise<DispatchSettingsSnapshot> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return DEFAULT_DISPATCH_SETTINGS;
  }

  try {
    const settings = await fetchAdminJson<Partial<DispatchSettingsSnapshot>>(
      "admin/settings/dispatch",
      apiBaseUrl,
      apiToken,
    );

    return {
      ...DEFAULT_DISPATCH_SETTINGS,
      ...settings,
    };
  } catch {
    return DEFAULT_DISPATCH_SETTINGS;
  }
}

export async function getDriverBonusSettingsSnapshot(): Promise<DriverBonusSettingsSnapshot> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return DEFAULT_DRIVER_BONUS_SETTINGS;
  }

  try {
    const settings = await fetchAdminJson<Partial<DriverBonusSettingsSnapshot>>(
      "admin/settings/driver-bonus",
      apiBaseUrl,
      apiToken,
    );

    return {
      ...DEFAULT_DRIVER_BONUS_SETTINGS,
      ...settings,
    };
  } catch {
    return DEFAULT_DRIVER_BONUS_SETTINGS;
  }
}

export async function getPromoCodesSnapshot(): Promise<PromoCodeSnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return DEMO_PROMO_CODES;
  }

  try {
    const items = await fetchAdminJson<
      Array<Parameters<typeof normalizePromoCodeSnapshot>[0]>
    >("admin/promo-codes", apiBaseUrl, apiToken);

    return items.map((item) => normalizePromoCodeSnapshot(item));
  } catch {
    return DEMO_PROMO_CODES;
  }
}

export async function getCityDetailSnapshot(
  cityId: string,
): Promise<CitySnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoCity = DEMO_CITIES.find((city) => city.id === cityId) ?? null;

  if (!apiToken) {
    return demoCity;
  }

  try {
    const item = await fetchAdminJson<
      Parameters<typeof normalizeCitySnapshot>[0]
    >(`admin/cities/${cityId}`, apiBaseUrl, apiToken);

    return normalizeCitySnapshot(item);
  } catch {
    return demoCity;
  }
}

export async function getTariffDetailSnapshot(
  tariffId: string,
): Promise<TariffSnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoTariff =
    DEMO_TARIFFS.find((tariff) => tariff.id === tariffId) ?? null;

  if (!apiToken) {
    return demoTariff;
  }

  try {
    const item = await fetchAdminJson<
      Parameters<typeof normalizeTariffSnapshot>[0]
    >(`admin/tariffs/${tariffId}`, apiBaseUrl, apiToken);

    return normalizeTariffSnapshot(item);
  } catch {
    return demoTariff;
  }
}

export async function getPromoCodeDetailSnapshot(
  promoCodeId: string,
): Promise<PromoCodeSnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoPromoCode =
    DEMO_PROMO_CODES.find((promoCode) => promoCode.id === promoCodeId) ?? null;

  if (!apiToken) {
    return demoPromoCode;
  }

  try {
    const item = await fetchAdminJson<
      Parameters<typeof normalizePromoCodeSnapshot>[0]
    >(`admin/promo-codes/${promoCodeId}`, apiBaseUrl, apiToken);

    return normalizePromoCodeSnapshot(item);
  } catch {
    return demoPromoCode;
  }
}

export async function getPromoCodeAnalyticsSnapshot(
  promoCodeId: string,
  query: PromoCodeAnalyticsQuery = {},
): Promise<PromoCodeAnalyticsSnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const periodRange =
    !query.dateFrom && !query.dateTo
      ? resolvePeriodDateRange(query.period)
      : null;
  const dateFrom = query.dateFrom ?? periodRange?.from;
  const dateTo = query.dateTo ?? periodRange?.to;

  if (!apiToken) {
    return null;
  }

  try {
    const item = await fetchAdminJson<
      Parameters<typeof normalizePromoCodeAnalyticsSnapshot>[0]
    >(
      `admin/promo-codes/${promoCodeId}/analytics${buildQueryString({
        period: !query.dateFrom && !query.dateTo ? query.period : undefined,
        cityId: query.cityId,
        dateFrom,
        dateTo,
        status: query.status,
        serviceType: query.serviceType,
        paymentMethod: query.paymentMethod,
      })}`,
      apiBaseUrl,
      apiToken,
    );

    return normalizePromoCodeAnalyticsSnapshot(item);
  } catch {
    return null;
  }
}

export async function getAdminOrdersSnapshot(
  query: AdminOrdersQuery = {},
): Promise<AdminOrdersSnapshot> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoOrders = filterDemoOrders(query);
  const periodRange =
    !query.dateFrom && !query.dateTo
      ? resolvePeriodDateRange(query.period)
      : null;
  const dateFrom = query.dateFrom ?? periodRange?.from;
  const dateTo = query.dateTo ?? periodRange?.to;

  if (!apiToken) {
    return demoOrders;
  }

  try {
    const response = await fetchAdminJson<AdminOrdersResponse>(
      `admin/orders${buildQueryString({
        status: query.status,
        serviceType: query.serviceType,
        paymentMethod: query.paymentMethod,
        promoCodeId: query.promoCodeId,
        cityId: query.cityId,
        dateFrom,
        dateTo,
        cursor: query.cursor,
        limit: query.limit ?? 20,
      })}`,
      apiBaseUrl,
      apiToken,
    );

    return {
      items: response.items.map((item) => normalizeAdminOrderSnapshot(item)),
      nextCursor: response.nextCursor,
    };
  } catch {
    return demoOrders;
  }
}

export async function getFinancialReportSnapshot(
  query: ReportsSnapshotQuery = {},
): Promise<FinancialSnapshot> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return filterDemoFinancial(query);
  }

  try {
    return await fetchAdminJson<FinancialSnapshot>(
      `admin/reports/financial${buildQueryString({
        period: query.period ?? "day",
        cityId: query.cityId,
      })}`,
      apiBaseUrl,
      apiToken,
    );
  } catch {
    return filterDemoFinancial(query);
  }
}

export async function getOperationsReportSnapshot(
  query: ReportsSnapshotQuery = {},
): Promise<OperationsSnapshot> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return filterDemoOperations(query);
  }

  try {
    return await fetchAdminJson<OperationsSnapshot>(
      `admin/reports/operations${buildQueryString({
        period: query.period ?? "day",
        cityId: query.cityId,
      })}`,
      apiBaseUrl,
      apiToken,
    );
  } catch {
    return filterDemoOperations(query);
  }
}

export async function getUsersSnapshot(
  query: UsersSnapshotQuery = {},
): Promise<UserSnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return filterDemoUsers(query);
  }

  try {
    const items = await fetchAdminJson<
      Array<{
        id: string;
        phone: string;
        name?: string | null;
        preferredLanguage?: string | null;
        preferredCurrency?: string | null;
        bonusBalance?: string | number | null;
        isBlocked?: boolean | null;
        createdAt?: string | Date | null;
        updatedAt?: string | Date | null;
      }>
    >(
      `admin/users${buildQueryString({
        query: query.query,
        preferredLanguage: query.preferredLanguage,
        isBlocked: query.isBlocked,
        limit: query.limit ?? 100,
      })}`,
      apiBaseUrl,
      apiToken,
    );

    return items.map((item) => normalizeUserSnapshot(item));
  } catch {
    return filterDemoUsers(query);
  }
}

export async function getUserDetailSnapshot(
  userId: string,
): Promise<UserSnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoUser = DEMO_USERS.find((user) => user.id === userId) ?? null;

  if (!apiToken) {
    return demoUser;
  }

  try {
    const item = await fetchAdminJson<{
      id: string;
      phone: string;
      name?: string | null;
      preferredLanguage?: string | null;
      preferredCurrency?: string | null;
      bonusBalance?: string | number | null;
      isBlocked?: boolean | null;
      createdAt?: string | Date | null;
      updatedAt?: string | Date | null;
    }>(`admin/users/${userId}`, apiBaseUrl, apiToken);

    return normalizeUserSnapshot(item);
  } catch {
    return demoUser;
  }
}

export async function getExecutorsSnapshot(
  query: ExecutorsSnapshotQuery = {},
): Promise<ExecutorSnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return filterDemoExecutors(query);
  }

  try {
    const items = await fetchAdminJson<
      Array<{
        id: string;
        userId: string;
        user?: {
          id: string;
          phone: string;
          name?: string | null;
          preferredLanguage?: string | null;
          preferredCurrency?: string | null;
          bonusBalance?: string | number | null;
          isBlocked?: boolean | null;
          createdAt?: string | Date | null;
          updatedAt?: string | Date | null;
        } | null;
        executorType?: string | null;
        vehicleType?: string | null;
        carClass?: string | null;
        isOnline?: boolean | null;
        rating?: string | number | null;
        cancelRate?: string | number | null;
        balance?: string | number | null;
        cityId?: string | null;
        city?: {
          id: string;
          nameRu?: string | null;
          nameKk?: string | null;
        } | null;
        verificationStatus?: string | null;
        createdAt?: string | Date | null;
      }>
    >(
      `admin/executors${buildQueryString({
        query: query.query,
        cityId: query.cityId,
        executorType: query.executorType,
        vehicleType: query.vehicleType,
        verificationStatus: query.verificationStatus,
        isOnline: query.isOnline,
        isBlocked: query.isBlocked,
        limit: query.limit ?? 100,
      })}`,
      apiBaseUrl,
      apiToken,
    );

    return items.map((item) => normalizeExecutorSnapshot(item));
  } catch {
    throw new Error("Не удалось загрузить водителей из API. Повторите попытку позже.");
  }
}

export async function getExecutorDetailSnapshot(
  executorId: string,
): Promise<ExecutorSnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoExecutor =
    DEMO_EXECUTORS.find((executor) => executor.id === executorId) ?? null;

  if (!apiToken) {
    return demoExecutor;
  }

  try {
    const item = await fetchAdminJson<{
      id: string;
      userId: string;
      user?: {
        id: string;
        phone: string;
        name?: string | null;
        preferredLanguage?: string | null;
        preferredCurrency?: string | null;
        bonusBalance?: string | number | null;
        isBlocked?: boolean | null;
        createdAt?: string | Date | null;
        updatedAt?: string | Date | null;
      } | null;
      executorType?: string | null;
      vehicleType?: string | null;
      carClass?: string | null;
      isOnline?: boolean | null;
      rating?: string | number | null;
      cancelRate?: string | number | null;
      balance?: string | number | null;
      cityId?: string | null;
      city?: {
        id: string;
        nameRu?: string | null;
        nameKk?: string | null;
      } | null;
      verificationStatus?: string | null;
      createdAt?: string | Date | null;
    }>(`admin/executors/${executorId}`, apiBaseUrl, apiToken);

    return normalizeExecutorSnapshot(item);
  } catch {
    return demoExecutor;
  }
}

export async function getExecutorBalanceTopUpsSnapshot({
  status,
}: {
  status?: "pending" | "invoiced" | "confirmed" | "rejected";
} = {}): Promise<ExecutorBalanceTopUpSnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return [];
  }

  try {
    const items = await fetchAdminJson<
      Array<Parameters<typeof normalizeExecutorBalanceTopUpSnapshot>[0]>
    >(
      `admin/executor-balance-topups${buildQueryString({ status })}`,
      apiBaseUrl,
      apiToken,
    );
    return items.map((item) => normalizeExecutorBalanceTopUpSnapshot(item));
  } catch {
    return [];
  }
}

export async function getExecutorPayoutsSnapshot({
  status,
}: {
  status?: "pending" | "paid" | "rejected";
} = {}): Promise<ExecutorPayoutSnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();

  if (!apiToken) {
    return [];
  }

  try {
    const items = await fetchAdminJson<
      Array<Parameters<typeof normalizeExecutorPayoutSnapshot>[0]>
    >(
      `admin/executor-payouts${buildQueryString({ status })}`,
      apiBaseUrl,
      apiToken,
    );
    return items.map((item) => normalizeExecutorPayoutSnapshot(item));
  } catch {
    return [];
  }
}

export async function getOrderDetailSnapshot(
  orderId: string,
): Promise<AdminOrderDetailSnapshot | null> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoDetail = buildDemoOrderDetail(orderId);

  if (!apiToken) {
    return demoDetail;
  }

  try {
    const item = await fetchAdminJson<
      Parameters<typeof normalizeOrderDetailSnapshot>[0]
    >(`admin/orders/${orderId}`, apiBaseUrl, apiToken);

    return normalizeOrderDetailSnapshot(item);
  } catch {
    return demoDetail;
  }
}

export async function getAdminNotesSnapshot(
  query: AdminNotesQuery = {},
): Promise<AdminNoteSnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoNotes = filterDemoAdminNotes(query);

  if (!apiToken) {
    return demoNotes;
  }

  try {
    const items = await fetchAdminJson<
      Array<{
        id: string;
        entityType?: string | null;
        entityId: string;
        body?: string | null;
        kind?: string | null;
        isPinned?: boolean | null;
        state?: string | null;
        createdById?: string | null;
        createdByName?: string | null;
        assignedToId?: string | null;
        assignedToName?: string | null;
        createdAt?: string | Date | null;
        resolvedAt?: string | Date | null;
        archivedAt?: string | Date | null;
        updatedAt?: string | Date | null;
      }>
    >(
      `admin/notes${buildQueryString({
        entityType: query.entityType,
        entityId: query.entityId,
        query: query.query,
        authorQuery: query.authorQuery,
        assignedToId: query.assignedToId,
        assigneeQuery: query.assigneeQuery,
        hasAssignee:
          typeof query.hasAssignee === "boolean"
            ? String(query.hasAssignee)
            : undefined,
        kind: query.kind,
        isPinned:
          typeof query.isPinned === "boolean"
            ? String(query.isPinned)
            : undefined,
        state: query.state,
        limit: query.limit ?? 100,
      })}`,
      apiBaseUrl,
      apiToken,
    );

    return items.map((item) => normalizeAdminNoteSnapshot(item));
  } catch {
    return demoNotes;
  }
}

export async function getAdminActivitySnapshot(
  query: AdminActivityQuery = {},
): Promise<AdminActivitySnapshot[]> {
  const apiBaseUrl = getAdminApiBaseUrl();
  const apiToken = getAdminApiToken();
  const demoActivity = filterDemoAdminActivity(query);

  if (!apiToken) {
    return demoActivity;
  }

  try {
    const items = await fetchAdminJson<
      Array<{
        id: string;
        action?: string | null;
        entityType?: string | null;
        entityId: string;
        actorId?: string | null;
        actorName?: string | null;
        metadata?: Record<string, unknown> | null;
        createdAt?: string | Date | null;
      }>
    >(
      `admin/activity${buildQueryString({
        entityType: query.entityType,
        entityId: query.entityId,
        action: query.action,
        group: query.group,
        window: query.window,
        actorId: query.actorId,
        actorQuery: query.actorQuery,
        query: query.query,
        limit: query.limit ?? 100,
      })}`,
      apiBaseUrl,
      apiToken,
    );

    return items.map((item) => normalizeAdminActivitySnapshot(item));
  } catch {
    return demoActivity;
  }
}

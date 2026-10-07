import { KaspiTransactionEntity } from '../modules/payments/kaspi/kaspi-transaction.entity';
import { AdminActivityLogEntity } from "../modules/admin/entities/admin-activity-log.entity";
import { AdminNoteEntity } from "../modules/admin/entities/admin-note.entity";
import { CityEntity } from "../modules/admin/entities/city.entity";
import { TariffEntity } from "../modules/admin/entities/tariff.entity";
import { DeliveryDetailEntity } from "../modules/delivery/entities/delivery-detail.entity";
import { DispatchOfferEntity } from "../modules/dispatch/entities/dispatch-offer.entity";
import { ExecutorBalanceTopUpEntity } from "../modules/executors/entities/executor-balance-top-up.entity";
import { ExecutorDocumentEntity } from "../modules/executors/entities/executor-document.entity";
import { ExecutorLocationEntity } from "../modules/executors/entities/executor-location.entity";
import { ExecutorPayoutEntity } from "../modules/executors/entities/executor-payout.entity";
import { ExecutorEntity } from "../modules/executors/entities/executor.entity";
import { DriverBonusPayoutEntity } from "../modules/executors/entities/driver-bonus-payout.entity";
import { DriverBonusSettingEntity } from "../modules/executors/entities/driver-bonus-setting.entity";
import { NotificationDeviceTokenEntity } from "../modules/notifications/entities/notification-device-token.entity";
import { NotificationTemplateEntity } from "../modules/notifications/entities/notification-template.entity";
import { OrderChatMessageEntity } from "../modules/orders/entities/order-chat-message.entity";
import { OrderStatusEventEntity } from "../modules/orders/entities/order-status-event.entity";
import { OrderEntity } from "../modules/orders/entities/order.entity";
import { RoutePointEntity } from "../modules/orders/entities/route-point.entity";
import { PaymentCardEntity } from "../modules/payments/entities/payment-card.entity";
import { PaymentEntity } from "../modules/payments/entities/payment.entity";
import { PromoCodeEntity } from "../modules/promo-codes/entities/promo-code.entity";
import { UserEntity } from "../modules/users/entities/user.entity";

export const databaseEntities = [
  KaspiTransactionEntity,
  UserEntity,
  AdminActivityLogEntity,
  AdminNoteEntity,
  CityEntity,
  PromoCodeEntity,
  ExecutorEntity,
  ExecutorBalanceTopUpEntity,
  ExecutorPayoutEntity,
  DriverBonusPayoutEntity,
  DriverBonusSettingEntity,
  ExecutorDocumentEntity,
  ExecutorLocationEntity,
  NotificationTemplateEntity,
  NotificationDeviceTokenEntity,
  OrderEntity,
  OrderChatMessageEntity,
  OrderStatusEventEntity,
  RoutePointEntity,
  DeliveryDetailEntity,
  DispatchOfferEntity,
  PaymentEntity,
  PaymentCardEntity,
  TariffEntity,
];

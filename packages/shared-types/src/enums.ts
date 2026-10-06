export enum ServiceType {
  TAXI = 'taxi',
  DELIVERY = 'delivery',
  INTERCITY = 'intercity',
  CARGO = 'cargo',
  SCOOTER = 'scooter',
}

export enum ExecutorType {
  DRIVER = 'driver',
  COURIER = 'courier',
  CARGO_DRIVER = 'cargo_driver',
}

export enum CourierVehicleType {
  BICYCLE = 'bicycle',
  MOPED = 'moped',
  SCOOTER = 'scooter',
  CAR = 'car',
}

export enum OrderStatus {
  DRAFT = 'draft',
  SEARCHING = 'searching',
  ACCEPTED = 'accepted',
  ARRIVING = 'arriving',
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED_CLIENT = 'cancelled_client',
  CANCELLED_EXECUTOR = 'cancelled_executor',
  CANCELLED_SYSTEM = 'cancelled_system',
  FAILED = 'failed',
}

export enum DeliveryStatus {
  PENDING_PICKUP = 'pending_pickup',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  AT_DOOR = 'at_door',
  DELIVERED_CONFIRMED = 'delivered_confirmed',
  DELIVERY_FAILED = 'delivery_failed',
  RETURNING = 'returning',
}

export enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  TRANSFER_KASPI = 'transfer_kaspi',
  TRANSFER_HALYK = 'transfer_halyk',
  CORPORATE = 'corporate',
  BONUS = 'bonus',
}

export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum Currency {
  RUB = 'RUB',
  KZT = 'KZT',
}

export enum UserRole {
  CLIENT = 'client',
  EXECUTOR = 'executor',
  OPERATOR = 'operator',
  ADMIN = 'admin',
  SUPPORT = 'support',
  FINANCE = 'finance',
}

import {
  Currency,
  PaymentMethod,
  PaymentStatus,
} from '@dos/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OrderEntity } from '../../orders/entities/order.entity';

@Entity({ name: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderEntity, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity | null;

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId!: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status_enum',
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
  })
  method!: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({
    type: 'enum',
    enum: Currency,
    enumName: 'currency_enum',
  })
  currency!: Currency;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 12,
    scale: 6,
    nullable: true,
  })
  exchangeRate!: string | null;

  @Column({
    name: 'amount_base',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  amountBase!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider!: string | null;

  @Column({
    name: 'provider_transaction_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerTransactionId!: string | null;

  @Index({ unique: true })
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  idempotencyKey!: string | null;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt!: Date | null;

  @Column({
    name: 'refunded_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  refundedAmount!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

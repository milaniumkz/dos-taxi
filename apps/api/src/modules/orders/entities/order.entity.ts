import {
  Currency,
  OrderStatus,
  PaymentMethod,
  ServiceType,
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

import { CityEntity } from '../../admin/entities/city.entity';
import { ExecutorEntity } from '../../executors/entities/executor.entity';
import { PromoCodeEntity } from '../../promo-codes/entities/promo-code.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'orders' })
@Index('IDX_orders_client_id', ['clientId'])
@Index('IDX_orders_executor_id', ['executorId'])
@Index('IDX_orders_status', ['status'])
@Index('IDX_orders_city_id', ['cityId'])
@Index('IDX_orders_created_at', ['createdAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client!: UserEntity;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId!: string;

  @ManyToOne(() => ExecutorEntity, { nullable: true })
  @JoinColumn({ name: 'executor_id' })
  executor!: ExecutorEntity | null;

  @Column({ name: 'executor_id', type: 'uuid', nullable: true })
  executorId!: string | null;

  @Column({
    name: 'service_type',
    type: 'enum',
    enum: ServiceType,
    enumName: 'service_type_enum',
  })
  serviceType!: ServiceType;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
    default: OrderStatus.DRAFT,
  })
  status!: OrderStatus;

  @ManyToOne(() => CityEntity, { nullable: false })
  @JoinColumn({ name: 'city_id' })
  city!: CityEntity;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId!: string;

  @Column({
    type: 'enum',
    enum: Currency,
    enumName: 'currency_enum',
  })
  currency!: Currency;

  @Column({
    name: 'estimated_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  estimatedPrice!: string | null;

  @Column({
    name: 'final_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  finalPrice!: string | null;

  @Column({ name: 'distance_meters', type: 'int', nullable: true })
  distanceMeters!: number | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds!: number | null;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method_enum',
  })
  paymentMethod!: PaymentMethod;

  @ManyToOne(() => PromoCodeEntity, { nullable: true })
  @JoinColumn({ name: 'promo_code_id' })
  promoCode!: PromoCodeEntity | null;

  @Column({ name: 'promo_code_id', type: 'uuid', nullable: true })
  promoCodeId!: string | null;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount!: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'client_rating', type: 'smallint', nullable: true })
  clientRating!: number | null;

  @Column({ name: 'executor_rating', type: 'smallint', nullable: true })
  executorRating!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

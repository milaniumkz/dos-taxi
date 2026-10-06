import { OrderStatus } from '@dos/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { OrderEntity } from './order.entity';

@Entity({ name: 'order_status_events' })
export class OrderStatusEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
    nullable: true,
  })
  fromStatus!: OrderStatus | null;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
  })
  toStatus!: OrderStatus;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

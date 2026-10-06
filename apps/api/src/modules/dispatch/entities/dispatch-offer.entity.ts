import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ExecutorEntity } from '../../executors/entities/executor.entity';
import { OrderEntity } from '../../orders/entities/order.entity';

@Entity({ name: 'dispatch_offers' })
export class DispatchOfferEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => ExecutorEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'executor_id' })
  executor!: ExecutorEntity;

  @Column({ name: 'executor_id', type: 'uuid' })
  executorId!: string;

  @CreateDateColumn({ name: 'offered_at', type: 'timestamptz' })
  offeredAt!: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt!: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  response!: 'accepted' | 'rejected' | 'timeout' | null;
}

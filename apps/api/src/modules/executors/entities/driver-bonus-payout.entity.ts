import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { OrderEntity } from "../../orders/entities/order.entity";
import { ExecutorEntity } from "./executor.entity";

@Entity({ name: "driver_bonus_payouts" })
@Index("IDX_driver_bonus_payouts_executor_threshold", ["executorId", "thresholdCompletedOrders"], { unique: true })
export class DriverBonusPayoutEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ExecutorEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "executor_id" })
  executor!: ExecutorEntity;

  @Column({ name: "executor_id", type: "uuid" })
  executorId!: string;

  @ManyToOne(() => OrderEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: OrderEntity;

  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @Column({ name: "threshold_completed_orders", type: "int" })
  thresholdCompletedOrders!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

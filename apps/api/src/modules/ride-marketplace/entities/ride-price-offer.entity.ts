import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { OrderEntity } from "../../orders/entities/order.entity";
import { ExecutorEntity } from "../../executors/entities/executor.entity";
@Entity({ name: "ride_price_offers" })
@Index("IDX_one_accepted_ride_offer", ["orderId"], {
  unique: true,
  where: "status='accepted'",
})
@Index(["orderId", "executorId"], { unique: true })
export class RidePriceOfferEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @ManyToOne(() => OrderEntity)
  @JoinColumn({ name: "order_id" })
  order!: OrderEntity;
  @Column({ name: "order_id", type: "uuid" }) orderId!: string;
  @ManyToOne(() => ExecutorEntity)
  @JoinColumn({ name: "executor_id" })
  executor!: ExecutorEntity;
  @Column({ name: "executor_id", type: "uuid" }) executorId!: string;
  @Column({ name: "unit_price", type: "decimal", precision: 12, scale: 2 })
  unitPrice!: string;
  @Column({ name: "total_price", type: "decimal", precision: 12, scale: 2 })
  totalPrice!: string;
  @Column({ name: "price_steps", type: "int" }) priceSteps!: number;
  @Column({ name: "has_child_seat", type: "boolean", default: false })
  hasChildSeat!: boolean;
  @Column({ type: "int", default: 1 }) version!: number;
  @Column({ type: "varchar", length: 20, default: "pending" }) status!:
    | "pending"
    | "accepted"
    | "rejected"
    | "withdrawn"
    | "superseded";
  @Column({ name: "expires_at", type: "timestamptz" }) expiresAt!: Date;
  @Column({ name: "notification_sent_version", type: "int", default: 0 })
  notificationSentVersion!: number;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

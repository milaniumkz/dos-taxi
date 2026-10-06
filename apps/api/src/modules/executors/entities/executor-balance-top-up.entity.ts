import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { UserEntity } from "../../users/entities/user.entity";
import { ExecutorEntity } from "./executor.entity";

export type ExecutorBalanceTopUpStatus =
  | "pending"
  | "invoiced"
  | "confirmed"
  | "rejected";

@Entity({ name: "executor_balance_topups" })
export class ExecutorBalanceTopUpEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ExecutorEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "executor_id" })
  executor!: ExecutorEntity;

  @Column({ name: "executor_id", type: "uuid" })
  executorId!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 32 })
  phone!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: ExecutorBalanceTopUpStatus;

  @Column({
    name: "invoice_provider",
    type: "varchar",
    length: 20,
    default: "kaspi",
  })
  invoiceProvider!: string;

  @Column({ name: "admin_comment", type: "text", nullable: true })
  adminComment!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "confirmed_by_id" })
  confirmedBy!: UserEntity | null;

  @Column({ name: "confirmed_by_id", type: "uuid", nullable: true })
  confirmedById!: string | null;

  @Column({ name: "confirmed_at", type: "timestamptz", nullable: true })
  confirmedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

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

export type ExecutorPayoutStatus = "pending" | "paid" | "rejected";
export type ExecutorPayoutMethod = "kaspi" | "halyk" | "cash";

@Entity({ name: "executor_payouts" })
export class ExecutorPayoutEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ExecutorEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "executor_id" })
  executor!: ExecutorEntity;

  @Column({ name: "executor_id", type: "uuid" })
  executorId!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: ExecutorPayoutStatus;

  @Column({ type: "varchar", length: 20, default: "kaspi" })
  method!: ExecutorPayoutMethod;

  @Column({ name: "admin_comment", type: "text", nullable: true })
  adminComment!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "paid_by_id" })
  paidBy!: UserEntity | null;

  @Column({ name: "paid_by_id", type: "uuid", nullable: true })
  paidById!: string | null;

  @Column({ name: "paid_at", type: "timestamptz", nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

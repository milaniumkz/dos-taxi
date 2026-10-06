import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import { ExecutorEntity } from "./executor.entity";

@Entity({ name: "executor_locations" })
@Index("IDX_executor_locations_executor_id", ["executorId"])
export class ExecutorLocationEntity {
  @PrimaryColumn({ name: "executor_id", type: "uuid" })
  executorId!: string;

  @OneToOne(() => ExecutorEntity, { nullable: false })
  @JoinColumn({ name: "executor_id" })
  executor!: ExecutorEntity;

  @Column({ type: "double precision" })
  lat!: number;

  @Column({ type: "double precision" })
  lng!: number;

  @Column({ type: "smallint", nullable: true })
  heading!: number | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

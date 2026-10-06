import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { ExecutorEntity } from "./executor.entity";

@Entity({ name: "executor_documents" })
export class ExecutorDocumentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => ExecutorEntity, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "executor_id" })
  executor!: ExecutorEntity;

  @Column({ name: "executor_id", type: "uuid" })
  executorId!: string;

  @Column({ name: "document_type", type: "varchar", length: 50 })
  documentType!: string;

  @Column({ name: "file_name", type: "varchar", length: 255 })
  fileName!: string;

  @Column({ name: "file_url", type: "text" })
  fileUrl!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

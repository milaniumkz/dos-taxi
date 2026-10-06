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

import { UserEntity } from "../../users/entities/user.entity";

@Entity({ name: "admin_notes" })
@Index("IDX_admin_notes_entity", ["entityType", "entityId"])
@Index("IDX_admin_notes_created_by_id", ["createdById"])
@Index("IDX_admin_notes_kind", ["kind"])
@Index("IDX_admin_notes_pinned_created_at", ["isPinned", "createdAt"])
@Index("IDX_admin_notes_state", ["state"])
@Index("IDX_admin_notes_assigned_to_id", ["assignedToId"])
export class AdminNoteEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "entity_type", type: "varchar", length: 20 })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid" })
  entityId!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "varchar", length: 20, default: "context" })
  kind!: string;

  @Column({ name: "is_pinned", type: "boolean", default: false })
  isPinned!: boolean;

  @Column({ type: "varchar", length: 20, default: "open" })
  state!: string;

  @Column({ name: "created_by_id", type: "uuid", nullable: true })
  createdById!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "created_by_id" })
  createdBy!: UserEntity | null;

  @Column({ name: "assigned_to_id", type: "uuid", nullable: true })
  assignedToId!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "assigned_to_id" })
  assignedTo!: UserEntity | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "resolved_at", type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: "archived_at", type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

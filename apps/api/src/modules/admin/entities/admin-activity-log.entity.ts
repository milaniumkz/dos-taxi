import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "../../users/entities/user.entity";

@Entity({ name: "admin_activity_logs" })
@Index("IDX_admin_activity_logs_entity", ["entityType", "entityId"])
@Index("IDX_admin_activity_logs_actor_id", ["actorId"])
@Index("IDX_admin_activity_logs_action", ["action"])
@Index("IDX_admin_activity_logs_created_at", ["createdAt"])
export class AdminActivityLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "actor_id" })
  actor!: UserEntity | null;

  @Column({ type: "varchar", length: 64 })
  action!: string;

  @Column({ name: "entity_type", type: "varchar", length: 32 })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid" })
  entityId!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

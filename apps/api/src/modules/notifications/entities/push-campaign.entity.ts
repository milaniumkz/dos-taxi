import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "push_campaigns" })
export class PushCampaignEntity {
  @PrimaryColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 100 }) title!: string;
  @Column({ type: "varchar", length: 1000 }) body!: string;
  @Column({ type: "varchar", length: 20 }) audience!:
    | "all"
    | "passenger"
    | "driver";
  @Column({ name: "actor_id", type: "uuid", nullable: true }) actorId!:
    | string
    | null;
  @Column({ type: "varchar", length: 20, default: "queued" }) status!: string;
  @Column({ name: "queued_devices", type: "int", default: 0 })
  queuedDevices!: number;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

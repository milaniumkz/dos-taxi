import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "driver_bonus_settings" })
export class DriverBonusSettingEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 40, unique: true, default: "default" })
  key!: string;

  @Column({ name: "is_enabled", type: "boolean", default: true })
  isEnabled!: boolean;

  @Column({ name: "orders_required", type: "int", default: 20 })
  ordersRequired!: number;

  @Column({ name: "bonus_amount", type: "decimal", precision: 12, scale: 2, default: 5000 })
  bonusAmount!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

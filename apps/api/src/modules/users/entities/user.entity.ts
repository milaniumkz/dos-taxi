import { Currency } from "@dos/shared-types";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 20 })
  phone!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  name!: string | null;

  @Column({
    name: "preferred_language",
    type: "varchar",
    length: 5,
    default: "ru",
  })
  preferredLanguage!: string;

  @Column({
    name: "preferred_currency",
    type: "enum",
    enum: Currency,
    enumName: "currency_enum",
    default: Currency.KZT,
  })
  preferredCurrency!: Currency;

  @Column({
    name: "bonus_balance",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  bonusBalance!: string;

  @Column({ name: "is_blocked", type: "boolean", default: false })
  isBlocked!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

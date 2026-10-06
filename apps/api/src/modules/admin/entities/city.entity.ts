import { Currency } from "@dos/shared-types";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "cities" })
export class CityEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "name_ru", type: "varchar", length: 100 })
  nameRu!: string;

  @Column({ name: "name_kk", type: "varchar", length: 100 })
  nameKk!: string;

  @Column({ name: "country_code", type: "varchar", length: 3 })
  countryCode!: string;

  @Column({
    type: "enum",
    enum: Currency,
    enumName: "currency_enum",
  })
  currency!: Currency;

  @Column({ type: "varchar", length: 50 })
  timezone!: string;

  @Column({ name: "is_active", type: "boolean", default: false })
  isActive!: boolean;

  @Column({ name: "service_zone", type: "jsonb", nullable: true })
  serviceZone!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

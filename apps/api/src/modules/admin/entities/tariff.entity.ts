import { Currency, ServiceType } from "@dos/shared-types";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { UserEntity } from "../../users/entities/user.entity";

import { CityEntity } from "./city.entity";

@Entity({ name: "tariffs" })
export class TariffEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CityEntity, { nullable: false })
  @JoinColumn({ name: "city_id" })
  city!: CityEntity;

  @Column({ name: "city_id", type: "uuid" })
  cityId!: string;

  @Column({
    name: "service_type",
    type: "enum",
    enum: ServiceType,
    enumName: "service_type_enum",
  })
  serviceType!: ServiceType;

  @Column({
    name: "vehicle_class",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  vehicleClass!: string | null;

  @Column({ name: "name_ru", type: "varchar", length: 100 })
  nameRu!: string;

  @Column({ name: "name_kk", type: "varchar", length: 100 })
  nameKk!: string;

  @Column({ name: "base_price", type: "decimal", precision: 12, scale: 2 })
  basePrice!: string;

  @Column({ name: "price_per_km", type: "decimal", precision: 12, scale: 4 })
  pricePerKm!: string;

  @Column({
    name: "price_per_minute",
    type: "decimal",
    precision: 12,
    scale: 4,
  })
  pricePerMinute!: string;

  @Column({ name: "minimum_price", type: "decimal", precision: 12, scale: 2 })
  minimumPrice!: string;

  @Column({ name: "free_waiting_seconds", type: "int", default: 180 })
  freeWaitingSeconds!: number;

  @Column({
    name: "paid_waiting_per_minute",
    type: "decimal",
    precision: 12,
    scale: 4,
    default: 0,
  })
  paidWaitingPerMinute!: string;

  @Column({
    name: "commission_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 10,
  })
  commissionPercent!: string;

  @Column({
    name: "commission_fixed",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  commissionFixed!: string;

  @Column({
    type: "enum",
    enum: Currency,
    enumName: "currency_enum",
  })
  currency!: Currency;

  @Column({ name: "valid_from", type: "timestamptz" })
  validFrom!: Date;

  @Column({ name: "valid_to", type: "timestamptz", nullable: true })
  validTo!: Date | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: "created_by" })
  createdBy!: UserEntity | null;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

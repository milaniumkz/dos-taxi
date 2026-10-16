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

  @Column({
    name: "ride_pricing_basis",
    type: "varchar",
    length: 20,
    default: "seat",
  })
  ridePricingBasis!: "seat" | "salon";

  @Column({
    name: "ride_minimum_order_kzt",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 500,
  })
  rideMinimumOrderKzt!: string;

  @Column({
    name: "ride_exchange_rate",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 7,
  })
  rideExchangeRate!: string;

  @Column({
    name: "ride_price_step_kzt",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 50,
  })
  ridePriceStepKzt!: string;

  @Column({
    name: "ride_commission_percent",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 10,
  })
  rideCommissionPercent!: string;

  @Column({
    name: "ride_minimum_driver_balance",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 100,
  })
  rideMinimumDriverBalance!: string;

  @Column({ name: "ride_offer_ttl_seconds", type: "int", default: 30 })
  rideOfferTtlSeconds!: number;

  @Column({
    name: "ride_commission_fixed",
    type: "decimal",
    precision: 12,
    scale: 2,
    default: 0,
  })
  rideCommissionFixed!: string;
  @Column({ name: "ride_manual_price_policy", type: "jsonb", nullable: true })
  rideManualPricePolicy!: {
    rubMinimum: string;
    kztMinimum: string;
    kztThreshold: string;
  } | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

import { CourierVehicleType, ExecutorType } from "@dos/shared-types";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { CityEntity } from "../../admin/entities/city.entity";
import { UserEntity } from "../../users/entities/user.entity";

@Entity({ name: "executors" })
export class ExecutorEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: "user_id" })
  user!: UserEntity;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({
    name: "executor_type",
    type: "enum",
    enum: ExecutorType,
    enumName: "executor_type_enum",
  })
  executorType!: ExecutorType;

  @Column({
    name: "vehicle_type",
    type: "enum",
    enum: CourierVehicleType,
    enumName: "courier_vehicle_type_enum",
    nullable: true,
  })
  vehicleType!: CourierVehicleType | null;

  @Column({ name: "car_class", type: "varchar", length: 50, nullable: true })
  carClass!: string | null;

  @Column({ name: "vehicle_make", type: "varchar", length: 80, nullable: true })
  vehicleMake!: string | null;

  @Column({
    name: "vehicle_model",
    type: "varchar",
    length: 80,
    nullable: true,
  })
  vehicleModel!: string | null;

  @Column({ name: "vehicle_year", type: "int", nullable: true })
  vehicleYear!: number | null;

  @Column({
    name: "vehicle_color",
    type: "varchar",
    length: 40,
    nullable: true,
  })
  vehicleColor!: string | null;

  @Column({
    name: "vehicle_plate",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  vehiclePlate!: string | null;

  @Column({
    name: "enabled_tariffs",
    type: "text",
    array: true,
    default: () =>
      "ARRAY['economy','comfort','comfort_plus','business']::text[]",
  })
  enabledTariffs!: string[];

  @Column({ name: "is_online", type: "boolean", default: false })
  isOnline!: boolean;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 5 })
  rating!: string;

  @Column({
    name: "cancel_rate",
    type: "decimal",
    precision: 5,
    scale: 2,
    default: 0,
  })
  cancelRate!: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  balance!: string;

  @ManyToOne(() => CityEntity, { nullable: true })
  @JoinColumn({ name: "city_id" })
  city!: CityEntity | null;

  @Column({ name: "city_id", type: "uuid", nullable: true })
  cityId!: string | null;

  @Column({
    name: "verification_status",
    type: "varchar",
    length: 20,
    default: "pending",
  })
  verificationStatus!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

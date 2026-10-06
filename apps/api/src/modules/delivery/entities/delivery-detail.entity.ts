import {
  CourierVehicleType,
  DeliveryStatus,
} from '@dos/shared-types';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { OrderEntity } from '../../orders/entities/order.entity';

@Entity({ name: 'delivery_details' })
export class DeliveryDetailEntity {
  @PrimaryColumn({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @OneToOne(() => OrderEntity, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({
    name: 'courier_vehicle_type',
    type: 'enum',
    enum: CourierVehicleType,
    enumName: 'courier_vehicle_type_enum',
  })
  courierVehicleType!: CourierVehicleType;

  @Column({ name: 'package_description', type: 'text', nullable: true })
  packageDescription!: string | null;

  @Column({ name: 'package_photo_url', type: 'text', nullable: true })
  packagePhotoUrl!: string | null;

  @Column({
    name: 'declared_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  declaredValue!: string | null;

  @Column({ name: 'is_fragile', type: 'boolean', default: false })
  isFragile!: boolean;

  @Column({ name: 'requires_return', type: 'boolean', default: false })
  requiresReturn!: boolean;

  @Column({
    name: 'cash_on_delivery',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  cashOnDelivery!: string | null;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: DeliveryStatus,
    enumName: 'delivery_status_enum',
    default: DeliveryStatus.PENDING_PICKUP,
  })
  deliveryStatus!: DeliveryStatus;

  @Column({ name: 'proof_photo_url', type: 'text', nullable: true })
  proofPhotoUrl!: string | null;

  @Column({ name: 'proof_signature_url', type: 'text', nullable: true })
  proofSignatureUrl!: string | null;

  @Column({
    name: 'recipient_code',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  recipientCode!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

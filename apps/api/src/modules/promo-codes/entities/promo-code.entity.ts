import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'promo_codes' })
export class PromoCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({
    name: 'discount_type',
    type: 'varchar',
    length: 20,
    default: 'fixed',
  })
  discountType!: string;

  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountValue!: string;

  @Column({ name: 'max_uses', type: 'int', nullable: true })
  maxUses!: number | null;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

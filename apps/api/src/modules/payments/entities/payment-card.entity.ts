import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'payment_cards' })
@Index('IDX_payment_cards_user_id', ['userId'])
export class PaymentCardEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({
    name: 'provider_card_id',
    type: 'varchar',
    length: 255,
  })
  providerCardId!: string;

  @Column({ type: 'varchar', length: 4 })
  last4!: string;

  @Column({ type: 'varchar', length: 50 })
  brand!: string;

  @Column({ name: 'holder_name', type: 'varchar', length: 100, nullable: true })
  holderName!: string | null;

  @Column({ name: 'exp_month', type: 'smallint', nullable: true })
  expMonth!: number | null;

  @Column({ name: 'exp_year', type: 'smallint', nullable: true })
  expYear!: number | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

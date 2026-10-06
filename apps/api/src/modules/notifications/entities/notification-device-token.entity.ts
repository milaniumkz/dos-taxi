import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'notification_device_tokens' })
@Index('IDX_notification_device_tokens_user_id', ['userId'])
@Index('IDX_notification_device_tokens_token', ['token'], { unique: true })
export class NotificationDeviceTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 512 })
  token!: string;

  @Column({ type: 'varchar', length: 20, default: 'unknown' })
  platform!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  role!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'last_seen_at',
    type: 'timestamptz',
    default: () => 'NOW()',
  })
  lastSeenAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExecutorEntity } from '../../executors/entities/executor.entity';
import { ExecutorBalanceTopUpEntity } from '../../executors/entities/executor-balance-top-up.entity';

@Entity('kaspi_transactions')
@Index(['executorId'])
export class KaspiTransactionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' }) id!: string;
  @Column({ name: 'txn_id', type: 'varchar', length: 18, unique: true })
  txnId!: string;
  @Column({ name: 'executor_id', type: 'uuid' }) executorId!: string;
  @ManyToOne(() => ExecutorEntity, { nullable: false })
  @JoinColumn({ name: 'executor_id' })
  executor!: ExecutorEntity;
  @Column({ type: 'varchar', length: 11 }) account!: string;
  @Column({ type: 'numeric', precision: 12, scale: 2 }) amount!: string;
  @Column({ name: 'txn_date', type: 'varchar', length: 14 }) txnDate!: string;
  @Column({ name: 'topup_id', type: 'uuid' }) topupId!: string;
  @ManyToOne(() => ExecutorBalanceTopUpEntity, { nullable: false })
  @JoinColumn({ name: 'topup_id' })
  topup!: ExecutorBalanceTopUpEntity;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

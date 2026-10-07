import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExecutorEntity } from '../../executors/entities/executor.entity';
import { ExecutorBalanceTopUpEntity } from '../../executors/entities/executor-balance-top-up.entity';
import { KaspiQueryDto, KaspiResponseDto } from './kaspi-query.dto';

type Transaction = {
  id: string;
  account: string;
  amount: string;
  txn_date: string;
};

@Injectable()
export class KaspiService {
  constructor(private readonly dataSource: DataSource) {}

  async handle(query: KaspiQueryDto): Promise<KaspiResponseDto> {
    const failure = (result: number, comment: string): KaspiResponseDto => ({
      txn_id: query.txn_id,
      result,
      comment,
    });
    const phone = `+${query.account}`;
    if (query.command === 'check') {
      const executor = await this.dataSource
        .getRepository(ExecutorEntity)
        .findOne({ where: { user: { phone } }, relations: ['user', 'city'] });
      return this.available(executor)
        ? failure(0, 'OK')
        : failure(1, 'Account not found or unavailable');
    }
    if (!this.validDate(query.txn_date) || Number(query.sum) <= 0)
      return failure(5, 'Invalid payment date or amount');
    const amount = Number(query.sum).toFixed(2);
    return this.dataSource.transaction(async (manager) => {
      await manager.query("SET LOCAL lock_timeout = '5s'");
      await manager.query("SET LOCAL statement_timeout = '10s'");
      // The same txn_id is serialized across all API processes.
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`kaspi:${query.txn_id}`],
      );
      const previous: Transaction[] = await manager.query(
        'SELECT id::text, account, amount::text, txn_date FROM kaspi_transactions WHERE txn_id=$1',
        [query.txn_id],
      );
      const saved = previous[0];
      if (saved) {
        if (
          saved.account !== query.account ||
          Number(saved.amount).toFixed(2) !== amount ||
          saved.txn_date !== query.txn_date
        )
          return failure(5, 'Transaction parameters conflict');
        return {
          txn_id: query.txn_id,
          result: 0,
          comment: 'OK',
          prv_txn_id: saved.id,
          sum: Number(saved.amount).toFixed(2),
        };
      }
      const executor = await manager
        .getRepository(ExecutorEntity)
        .findOne({ where: { user: { phone } }, relations: ['user', 'city'] });
      if (!this.available(executor) || !executor)
        return failure(1, 'Account not found or unavailable');
      // Lock balance before updating, coordinating with manual payouts/topups.
      const locked = await manager
        .getRepository(ExecutorEntity)
        .findOne({
          where: { id: executor.id },
          lock: { mode: 'pessimistic_write' },
        });
      if (!locked) return failure(1, 'Account not found');
      const topup = await manager
        .getRepository(ExecutorBalanceTopUpEntity)
        .save({
          executorId: executor.id,
          amount,
          phone,
          status: 'confirmed',
          invoiceProvider: 'kaspi',
          confirmedAt: new Date(),
          confirmedById: null,
          adminComment: `Kaspi txn_id=${query.txn_id}; txn_date=${query.txn_date}`,
        });
      const created: { id: string }[] = await manager.query(
        'INSERT INTO kaspi_transactions(txn_id, executor_id, account, amount, txn_date, topup_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text',
        [
          query.txn_id,
          executor.id,
          query.account,
          amount,
          query.txn_date,
          topup.id,
        ],
      );
      await manager.query(
        'UPDATE executors SET balance=balance+$1::numeric WHERE id=$2',
        [amount, executor.id],
      );
      return {
        txn_id: query.txn_id,
        result: 0,
        comment: 'OK',
        prv_txn_id: created[0].id,
        sum: amount,
      };
    });
  }

  private available(executor: ExecutorEntity | null): boolean {
    return Boolean(
      executor &&
      executor.executorType === 'driver' &&
      executor.verificationStatus === 'verified' &&
      !executor.user?.isBlocked &&
      executor.city?.currency === 'KZT',
    );
  }
  private validDate(value: string | undefined): boolean {
    if (!value || !/^\d{14}$/.test(value)) return false;
    const parts = [
      value.slice(0, 4),
      value.slice(4, 6),
      value.slice(6, 8),
      value.slice(8, 10),
      value.slice(10, 12),
      value.slice(12, 14),
    ].map(Number);
    const date = new Date(
      Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]),
    );
    return (
      date.getUTCFullYear() === parts[0] &&
      date.getUTCMonth() + 1 === parts[1] &&
      date.getUTCDate() === parts[2] &&
      date.getUTCHours() === parts[3] &&
      date.getUTCMinutes() === parts[4] &&
      date.getUTCSeconds() === parts[5]
    );
  }
}

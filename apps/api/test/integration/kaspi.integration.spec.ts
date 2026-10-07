import { randomUUID } from 'node:crypto';
import { Currency, ExecutorType } from '@dos/shared-types';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { databaseEntities } from '../../src/database/entities';
import { CityEntity } from '../../src/modules/admin/entities/city.entity';
import { ExecutorEntity } from '../../src/modules/executors/entities/executor.entity';
import { ExecutorBalanceTopUpEntity } from '../../src/modules/executors/entities/executor-balance-top-up.entity';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { KaspiController } from '../../src/modules/payments/kaspi/kaspi.controller';
import { KaspiService } from '../../src/modules/payments/kaspi/kaspi.service';
import { KaspiAccessGuard } from '../../src/modules/payments/kaspi/kaspi-access.guard';
import { KaspiTransactionEntity } from '../../src/modules/payments/kaspi/kaspi-transaction.entity';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

// Exercise real SQL transaction/locking and HTTP access checks in an isolated test schema.
describe('Kaspi online balance payments', () => {
  let db: DataSource;
  let app: INestApplication;
  let config: ConfigService;
  let driver: ExecutorEntity;
  const schema = `kaspi_test_${randomUUID().replaceAll('-', '')}`;
  const endpoint = '/api/v1/payments/kaspi';
  const payment = {
    command: 'pay',
    txn_id: '123456789012345678',
    txn_date: '20261007140000',
    account: '77010000000',
    sum: '5000.00',
  };

  beforeAll(async () => {
    const url =
      process.env.KASPI_TEST_DATABASE_URL ??
      process.env.PROMO_TEST_DATABASE_URL ??
      'postgresql://platform:platform@localhost:5432/platform_test';
    if (!new URL(url).pathname.endsWith('_test'))
      throw new Error('Use an isolated _test database');
    db = new DataSource({
      type: 'postgres',
      url,
      schema,
      entities: databaseEntities,
      synchronize: false,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    await db.synchronize();
    config = new ConfigService({
      KASPI_ENABLED: 'true',
      KASPI_ALLOWED_IPS: '127.0.0.1,::1',
    });
    const module = await Test.createTestingModule({
      controllers: [KaspiController],
      providers: [
        KaspiService,
        KaspiAccessGuard,
        { provide: DataSource, useValue: db },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await db.query(`TRUNCATE "${schema}".users, "${schema}".cities CASCADE`);
    config.set('KASPI_ENABLED', 'true');
    config.set('KASPI_ALLOWED_IPS', '127.0.0.1,::1');
    const city = await db
      .getRepository(CityEntity)
      .save({
        nameRu: 'Test',
        nameKk: 'Test',
        countryCode: 'KZ',
        currency: Currency.KZT,
        timezone: 'Asia/Almaty',
        isActive: true,
      });
    const user = await db
      .getRepository(UserEntity)
      .save({ phone: '+77010000000' });
    driver = await db
      .getRepository(ExecutorEntity)
      .save({
        userId: user.id,
        executorType: ExecutorType.DRIVER,
        cityId: city.id,
        verificationStatus: 'verified',
        balance: '1000.00',
      });
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
    }
  });

  it('checks a verified account without crediting the dummy sum', async () => {
    const response = await request(app.getHttpServer())
      .get(endpoint)
      .query({ ...payment, command: 'check', sum: '0.00' })
      .expect(200);
    expect(response.body).toEqual({
      txn_id: payment.txn_id,
      result: 0,
      comment: 'OK',
    });
    expect(
      (
        await db
          .getRepository(ExecutorEntity)
          .findOneByOrFail({ id: driver.id })
      ).balance,
    ).toBe('1000.00');
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('credits once for concurrent 18-digit transaction duplicates', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get(endpoint).query(payment).expect(200),
      ),
    );
    expect(responses.every((response) => response.body.result === 0)).toBe(
      true,
    );
    expect(
      new Set(responses.map((response) => response.body.prv_txn_id)).size,
    ).toBe(1);
    expect(responses[0].body.txn_id).toBe(payment.txn_id);
    expect(responses[0].body.sum).toBe('5000.00');
    expect(await db.getRepository(KaspiTransactionEntity).count()).toBe(1);
    expect(await db.getRepository(ExecutorBalanceTopUpEntity).count()).toBe(1);
    expect(
      (
        await db
          .getRepository(ExecutorEntity)
          .findOneByOrFail({ id: driver.id })
      ).balance,
    ).toBe('6000.00');
    expect(
      (await db.getRepository(KaspiTransactionEntity).find())[0].txnDate,
    ).toBe(payment.txn_date);
  });
  it('rejects changing the amount for a previously successful transaction', async () => {
    await request(app.getHttpServer()).get(endpoint).query(payment).expect(200);
    const response = await request(app.getHttpServer())
      .get(endpoint)
      .query({ ...payment, sum: '6000.00' })
      .expect(200);
    expect(response.body.result).toBe(5);
    expect(
      (
        await db
          .getRepository(ExecutorEntity)
          .findOneByOrFail({ id: driver.id })
      ).balance,
    ).toBe('6000.00');
  });
  it('serializes different payments to one balance without losing an update', async () => {
    const responses = await Promise.all(
      ['101', '102'].map((txn_id) =>
        request(app.getHttpServer())
          .get(endpoint)
          .query({ ...payment, txn_id })
          .expect(200),
      ),
    );
    expect(responses.map((response) => response.body.result)).toEqual([0, 0]);
    expect(
      (
        await db
          .getRepository(ExecutorEntity)
          .findOneByOrFail({ id: driver.id })
      ).balance,
    ).toBe('11000.00');
  });
  it('rolls back the topup and transaction when balance update fails, allowing a safe retry', async () => {
    await db.query(
      `ALTER TABLE "${schema}".executors ADD CONSTRAINT test_balance_limit CHECK(balance < 2000)`,
    );
    try {
      const response = await request(app.getHttpServer())
        .get(endpoint)
        .query(payment)
        .expect(200);
      expect(response.body.result).toBe(5);
      expect(await db.getRepository(KaspiTransactionEntity).count()).toBe(0);
      expect(await db.getRepository(ExecutorBalanceTopUpEntity).count()).toBe(
        0,
      );
      expect(
        (
          await db
            .getRepository(ExecutorEntity)
            .findOneByOrFail({ id: driver.id })
        ).balance,
      ).toBe('1000.00');
    } finally {
      await db.query(
        `ALTER TABLE "${schema}".executors DROP CONSTRAINT test_balance_limit`,
      );
    }
    const retried = await request(app.getHttpServer())
      .get(endpoint)
      .query(payment)
      .expect(200);
    expect(retried.body.result).toBe(0);
  });
  it('rejects missing/invalid accounting date, zero amounts and unknown accounts without side effects', async () => {
    for (const params of [
      { ...payment, txn_date: undefined },
      { ...payment, txn_date: '20260230140000' },
      { ...payment, sum: '0.00' },
    ]) {
      const response = await request(app.getHttpServer())
        .get(endpoint)
        .query(params)
        .expect(200);
      expect(response.body.result).toBe(5);
    }
    const missing = await request(app.getHttpServer())
      .get(endpoint)
      .query({ ...payment, account: '77019999999' })
      .expect(200);
    expect(missing.body.result).toBe(1);
    expect(await db.getRepository(KaspiTransactionEntity).count()).toBe(0);
  });
  it('does not accept forged forwarding headers or a disabled integration', async () => {
    config.set('KASPI_ALLOWED_IPS', '194.187.247.152');
    await request(app.getHttpServer())
      .get(endpoint)
      .set('X-Forwarded-For', '194.187.247.152')
      .query(payment)
      .expect(403);
    config.set('KASPI_ALLOWED_IPS', '127.0.0.1,::1');
    config.set('KASPI_ENABLED', 'false');
    await request(app.getHttpServer()).get(endpoint).query(payment).expect(403);
  });
  it('validates wire parameters instead of coercing transaction IDs or accepting card data', async () => {
    for (const params of [
      { ...payment, txn_id: '1234567890123456789' },
      { ...payment, sum: '-1.00' },
      { ...payment, sum: '1,00' },
      { ...payment, cardNumber: 'test' },
    ]) {
      await request(app.getHttpServer())
        .get(endpoint)
        .query(params)
        .expect(400);
    }
  });
});

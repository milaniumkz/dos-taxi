import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Repository } from 'typeorm';
import request from 'supertest';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { ExecutorEntity } from '../../src/modules/executors/entities/executor.entity';
import { CityEntity } from '../../src/modules/admin/entities/city.entity';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { RedisStoreService } from '../../src/shared/cache/redis-store.service';
import { configureHttpApplication } from '../../src/shared/http/configure-http-app';

describe('OTP limits on a shared IP', () => {
  let app: INestApplication;
  let cache: RedisStoreService;
  beforeEach(async () => {
    const config = new ConfigService({
      OTP_DEV_BYPASS: 'true',
      OTP_MAX_ATTEMPTS: '3',
      OTP_IP_MAX_ATTEMPTS: '100',
    });
    cache = new RedisStoreService(config);
    const service = new AuthService(
      {} as Repository<UserEntity>,
      {} as Repository<ExecutorEntity>,
      {} as Repository<CityEntity>,
      new JwtService(),
      config,
      cache,
      { sendSms: jest.fn() } as unknown as NotificationsService,
    );
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    await cache.onModuleDestroy();
    jest.restoreAllMocks();
  });
  it('limits one normalized phone without blocking another phone on the same IP', async () => {
    for (const phone of ['+77010000000', '77010000000', '87010000000']) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/send-otp')
        .send({ phone })
        .expect(201);
    }
    const limited = await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '7010000000' })
      .expect(429);
    expect(limited.body.code).toBe('OTP_RATE_LIMITED');
    expect(limited.body.details.retryAfterSeconds).toBeGreaterThan(3590);
    expect(Number(limited.headers['retry-after'])).toBe(
      limited.body.details.retryAfterSeconds,
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+77010000001' })
      .expect(201);
  });
  it('counts concurrent requests atomically in Redis and sets expiration', async () => {
    const redis = new RedisStoreService(
      new ConfigService({
        redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
      }),
    );
    const key = `otp_test:${randomUUID()}`;
    try {
      const counts = await Promise.all(
        Array.from({ length: 20 }, () => redis.increment(key, 60)),
      );
      expect(counts.sort((a, b) => a - b)).toEqual(
        Array.from({ length: 20 }, (_, index) => index + 1),
      );
      expect(await redis.ttl(key)).toBeGreaterThan(55);
    } finally {
      await redis.delete(key);
      await redis.onModuleDestroy();
    }
  });
  it('keeps the original expiration rather than extending it on each request', async () => {
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    await cache.increment('test', 3600);
    clock.mockReturnValue(now + 120000);
    await cache.increment('test', 3600);
    expect(await cache.ttl('test')).toBe(3480);
    clock.mockReturnValue(now + 3601000);
    expect(await cache.increment('test', 3600)).toBe(1);
  });
});

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type StoredRecord = {
  value: string;
  expiresAt: number | null;
};

@Injectable()
export class RedisStoreService implements OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(RedisStoreService.name);
  private client: Redis | null = null;
  private readonly memoryStore = new Map<string, StoredRecord>();
  private attemptedConnection = false;

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  async get(key: string): Promise<string | null> {
    const client = await this.getClient();
    if (client) {
      return client.get(key);
    }

    return this.getFromMemory(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async listJsonByPattern<T>(pattern: string): Promise<T[]> {
    const client = await this.getClient();
    if (client) {
      const records: T[] = [];
      let cursor = '0';

      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length === 0) {
          continue;
        }

        const values = await client.mget(keys);
        for (const finalValue of values) {
          if (!finalValue) {
            continue;
          }

          records.push(JSON.parse(finalValue) as T);
        }
      } while (cursor !== '0');

      return records;
    }

    const matcher = new RegExp(
      `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`,
    );

    return [...this.memoryStore.entries()]
      .filter(([key]) => matcher.test(key))
      .map(([, record]) => record)
      .filter((record) => !record.expiresAt || record.expiresAt > Date.now())
      .map((record) => JSON.parse(record.value) as T);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    const client = await this.getClient();
    if (client) {
      if (ttlSeconds) {
        await client.set(key, value, 'EX', ttlSeconds);
        return;
      }

      await client.set(key, value);
      return;
    }

    this.setInMemory(key, value, ttlSeconds);
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    if (client) {
      await client.del(key);
      return;
    }

    this.memoryStore.delete(key);
  }

  async increment(
    key: string,
    ttlSeconds: number,
  ): Promise<number> {
    const client = await this.getClient();
    if (client) {
      const value = await client.incr(key);
      if (value === 1) {
        await client.expire(key, ttlSeconds);
      }
      return value;
    }

    const currentValue = Number((await this.getFromMemory(key)) ?? '0') + 1;
    this.setInMemory(key, String(currentValue), ttlSeconds);
    return currentValue;
  }

  private async getClient(): Promise<Redis | null> {
    if (this.client) {
      return this.client;
    }

    if (this.attemptedConnection) {
      return null;
    }

    this.attemptedConnection = true;
    const redisUrl = this.configService.get<string>('redisUrl');
    if (!redisUrl) {
      return null;
    }

    try {
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      await client.connect();
      this.client = client;
      return client;
    } catch {
      this.logger.warn(
        'Falling back to in-memory cache because Redis is unavailable',
      );
      return null;
    }
  }

  private getFromMemory(key: string): string | null {
    const record = this.memoryStore.get(key);
    if (!record) {
      return null;
    }

    if (record.expiresAt && record.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }

    return record.value;
  }

  private setInMemory(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): void {
    this.memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
}

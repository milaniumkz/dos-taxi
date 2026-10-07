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
  private connection: Promise<Redis | null> | null = null;

  async onModuleDestroy(): Promise<void> {
    await (await this.connection)?.quit();
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

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
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

  async increment(key: string, ttlSeconds: number): Promise<number> {
    const client = await this.getClient();
    if (client) {
      return Number(
        await client.eval(
          `local value = redis.call('INCR', KEYS[1])
         if value == 1 or redis.call('TTL', KEYS[1]) < 0 then
           redis.call('EXPIRE', KEYS[1], ARGV[1])
         end
         return value`,
          1,
          key,
          ttlSeconds,
        ),
      );
    }

    const currentValue = Number(this.getFromMemory(key) ?? '0') + 1;
    const oldExpiry = this.memoryStore.get(key)?.expiresAt;
    this.setInMemory(key, String(currentValue), ttlSeconds);
    if (oldExpiry && oldExpiry > Date.now()) {
      this.memoryStore.get(key)!.expiresAt = oldExpiry;
    }
    return currentValue;
  }

  async ttl(key: string): Promise<number> {
    const client = await this.getClient();
    if (client) return Math.max(0, await client.ttl(key));
    const record = this.memoryStore.get(key);
    return record?.expiresAt
      ? Math.max(0, Math.ceil((record.expiresAt - Date.now()) / 1000))
      : 0;
  }

  private async getClient(): Promise<Redis | null> {
    if (this.client) return this.client;
    // Requests during startup must share the pending connection, not a separate memory counter.
    this.connection ??= this.connectClient();
    return this.connection;
  }

  private async connectClient(): Promise<Redis | null> {
    const redisUrl = this.configService.get<string>('redisUrl');
    if (!redisUrl) return null;
    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    try {
      await client.connect();
      this.client = client;
      return client;
    } catch {
      client.disconnect();
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

  private setInMemory(key: string, value: string, ttlSeconds?: number): void {
    this.memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }
}

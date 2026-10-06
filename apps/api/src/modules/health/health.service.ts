import {
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

type HealthStatus = 'ok' | 'error';
type CheckStatus = 'up' | 'down' | 'skipped';

type DependencyCheck = {
  status: CheckStatus;
  details?: Record<string, unknown>;
};

export type BasicHealthResponse = {
  status: 'ok';
  service: 'api';
  timestamp: string;
};

export type ReadinessResponse = {
  status: HealthStatus;
  service: 'api';
  timestamp: string;
  checks: {
    database: DependencyCheck;
    redis: DependencyCheck;
    storage: DependencyCheck;
  };
};

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  getBasicHealth(): BasicHealthResponse {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const status: HealthStatus =
      database.status === 'up' &&
      redis.status === 'up' &&
      storage.status === 'up'
        ? 'ok'
        : 'error';

    return {
      status,
      service: 'api',
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
        storage,
      },
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'up',
      };
    } catch (error) {
      return {
        status: 'down',
        details: this.normalizeError(error),
      };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const redisUrl = this.configService.get<string>('redisUrl');
    if (!redisUrl) {
      return {
        status: 'skipped',
        details: {
          reason: 'REDIS_URL is not configured',
        },
      };
    }

    const client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
    });

    try {
      await client.connect();
      await client.ping();
      return {
        status: 'up',
      };
    } catch (error) {
      return {
        status: 'down',
        details: this.normalizeError(error),
      };
    } finally {
      await client.quit().catch(() => undefined);
    }
  }

  private async checkStorage(): Promise<DependencyCheck> {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const bucket = this.configService.get<string>('S3_BUCKET');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'S3_SECRET_ACCESS_KEY',
    );

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return {
        status: 'skipped',
        details: {
          reason: 'S3 storage is not fully configured',
        },
      };
    }

    const client = new S3Client({
      region: this.configService.get<string>('S3_REGION') ?? 'auto',
      endpoint,
      forcePathStyle:
        this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    try {
      await client.send(
        new HeadBucketCommand({
          Bucket: bucket,
        }),
      );
      return {
        status: 'up',
      };
    } catch (error) {
      return {
        status: 'down',
        details: this.normalizeError(error),
      };
    }
  }

  private normalizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return {
      message: 'Unknown error',
    };
  }
}

import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';

import { HealthService } from '../../src/modules/health/health.service';

type DependencyCheck = Awaited<
  ReturnType<HealthService['getReadiness']>
>['checks']['database'];

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService(
      {
        query: jest.fn(),
      } as unknown as DataSource,
      {
        get: jest.fn(),
      } as unknown as ConfigService,
    );
  });

  it('returns a basic health payload', () => {
    const response = service.getBasicHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('api');
    expect(response.timestamp).toEqual(expect.any(String));
  });

  it('aggregates readiness checks as ok when all dependencies are up', async () => {
    Object.defineProperty(service, 'checkDatabase', {
      value: jest.fn<Promise<DependencyCheck>, []>().mockResolvedValue({
        status: 'up',
      }),
    });
    Object.defineProperty(service, 'checkRedis', {
      value: jest.fn<Promise<DependencyCheck>, []>().mockResolvedValue({
        status: 'up',
      }),
    });
    Object.defineProperty(service, 'checkStorage', {
      value: jest.fn<Promise<DependencyCheck>, []>().mockResolvedValue({
        status: 'up',
      }),
    });

    const response = await service.getReadiness();

    expect(response.status).toBe('ok');
    expect(response.checks.database.status).toBe('up');
    expect(response.checks.redis.status).toBe('up');
    expect(response.checks.storage.status).toBe('up');
  });

  it('marks readiness as error when any dependency is down', async () => {
    Object.defineProperty(service, 'checkDatabase', {
      value: jest.fn<Promise<DependencyCheck>, []>().mockResolvedValue({
        status: 'down',
        details: { message: 'db' },
      }),
    });
    Object.defineProperty(service, 'checkRedis', {
      value: jest.fn<Promise<DependencyCheck>, []>().mockResolvedValue({
        status: 'up',
      }),
    });
    Object.defineProperty(service, 'checkStorage', {
      value: jest.fn<Promise<DependencyCheck>, []>().mockResolvedValue({
        status: 'up',
      }),
    });

    const response = await service.getReadiness();

    expect(response.status).toBe('error');
    expect(response.checks.database.status).toBe('down');
    expect(response.checks.database.details).toEqual({ message: 'db' });
  });
});

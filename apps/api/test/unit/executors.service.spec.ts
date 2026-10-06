import { ExecutorType } from '@dos/shared-types';
import { Repository } from 'typeorm';

import { CityEntity } from '../../src/modules/admin/entities/city.entity';
import { ExecutorBalanceTopUpEntity } from '../../src/modules/executors/entities/executor-balance-top-up.entity';
import { ExecutorDocumentEntity } from '../../src/modules/executors/entities/executor-document.entity';
import { ExecutorLocationEntity } from '../../src/modules/executors/entities/executor-location.entity';
import { ExecutorEntity } from '../../src/modules/executors/entities/executor.entity';
import { ExecutorsService } from '../../src/modules/executors/executors.service';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { RedisStoreService } from '../../src/shared/cache/redis-store.service';
import { S3StorageService } from '../../src/shared/storage/s3-storage.service';

describe('ExecutorsService', () => {
  let executorsService: ExecutorsService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;
  let balanceTopUpsRepository: jest.Mocked<Repository<ExecutorBalanceTopUpEntity>>;
  let executorLocationsRepository: jest.Mocked<Repository<ExecutorLocationEntity>>;
  let executorDocumentsRepository: jest.Mocked<Repository<ExecutorDocumentEntity>>;
  let citiesRepository: jest.Mocked<Repository<CityEntity>>;
  let redisStoreService: jest.Mocked<RedisStoreService>;
  let s3StorageService: jest.Mocked<S3StorageService>;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      merge: jest.fn((entity, dto) => ({ ...entity, ...dto })),
      save: jest.fn(async (entity) => entity),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    executorsRepository = {
      findOne: jest.fn(),
      create: jest.fn((entity) => entity as ExecutorEntity),
      merge: jest.fn((entity, dto) => ({ ...entity, ...dto })),
      save: jest.fn(async (entity) => entity),
      findOneOrFail: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;
    balanceTopUpsRepository = {
      create: jest.fn((entity) => entity as ExecutorBalanceTopUpEntity),
      save: jest.fn(async (entity) => entity),
    } as unknown as jest.Mocked<Repository<ExecutorBalanceTopUpEntity>>;
    executorLocationsRepository = {
      upsert: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorLocationEntity>>;
    executorDocumentsRepository = {
      create: jest.fn((entity) => entity as ExecutorDocumentEntity),
      save: jest.fn(async (entity) => entity),
    } as unknown as jest.Mocked<Repository<ExecutorDocumentEntity>>;
    citiesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CityEntity>>;
    redisStoreService = {
      setJson: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;
    s3StorageService = {
      uploadExecutorDocument: jest.fn(),
    } as unknown as jest.Mocked<S3StorageService>;

    executorsService = new ExecutorsService(
      usersRepository,
      executorsRepository,
      balanceTopUpsRepository,
      executorLocationsRepository,
      executorDocumentsRepository,
      citiesRepository,
      redisStoreService,
      s3StorageService,
    );
  });

  it('creates executor profile when missing', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 'user-1',
      phone: '+77010000000',
      preferredLanguage: 'ru',
    } as UserEntity);
    executorsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'executor-1',
        userId: 'user-1',
        executorType: ExecutorType.DRIVER,
      } as ExecutorEntity);

    const result = await executorsService.updateProfile('user-1', {});

    expect(result.userId).toBe('user-1');
    expect(executorsRepository.create).toHaveBeenCalled();
  });

  it('updates online status and mirrors location to redis', async () => {
    executorsRepository.findOne.mockResolvedValue({
      id: 'executor-1',
      userId: 'user-1',
      executorType: ExecutorType.DRIVER,
      isOnline: false,
      verificationStatus: 'verified',
    } as ExecutorEntity);

    await executorsService.updateStatus('user-1', {
      isOnline: true,
      lat: 43.238949,
      lng: 76.889709,
      heading: 180,
    });

    expect(executorLocationsRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        executorId: 'executor-1',
        lat: 43.238949,
        lng: 76.889709,
        heading: 180,
      }),
      ['executorId'],
    );
    expect(redisStoreService.setJson).toHaveBeenCalledWith(
      'executor:location:executor-1',
      expect.objectContaining({
        executorId: 'executor-1',
        isOnline: true,
      }),
      300,
    );
  });

  it('rejects an unverified executor going online without writing status or location', async () => {
    executorsRepository.findOne.mockResolvedValue({
      id: 'executor-1',
      userId: 'user-1',
      executorType: ExecutorType.DRIVER,
      verificationStatus: 'pending',
      isOnline: false,
    } as ExecutorEntity);

    await expect(executorsService.updateStatus('user-1', {
      isOnline: true,
      lat: 43.238949,
      lng: 76.889709,
    })).rejects.toThrow('Executor profile must be verified before going online');
    expect(executorsRepository.save).not.toHaveBeenCalled();
    expect(executorLocationsRepository.upsert).not.toHaveBeenCalled();
    expect(redisStoreService.setJson).not.toHaveBeenCalled();
  });
});

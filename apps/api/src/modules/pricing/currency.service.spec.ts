import { Currency } from '@dos/shared-types';
import { ConfigService } from '@nestjs/config';

import { RedisStoreService } from '../../shared/cache/redis-store.service';

import { CurrencyService } from './currency.service';

describe('CurrencyService', () => {
  let currencyService: CurrencyService;
  let redisStoreService: jest.Mocked<RedisStoreService>;

  beforeEach(() => {
    redisStoreService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
    } as unknown as jest.Mocked<RedisStoreService>;

    currencyService = new CurrencyService(
      new ConfigService({
        CURRENCY_RUB_KZT_FALLBACK_RATE: '5.25',
      }),
      redisStoreService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns cached rate when available', async () => {
    redisStoreService.getJson.mockResolvedValue({ rate: 5.4 });

    await expect(
      currencyService.getRate(Currency.RUB, Currency.KZT),
    ).resolves.toBe(5.4);
    expect(redisStoreService.setJson).not.toHaveBeenCalled();
  });

  it('uses fallback rate when official fetch fails', async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('network unavailable'));

    await expect(
      currencyService.getRate(Currency.RUB, Currency.KZT),
    ).resolves.toBe(5.25);
    expect(redisStoreService.setJson).toHaveBeenCalledWith(
      'currency:rate:RUB:KZT',
      { rate: 5.25 },
      3600,
    );
  });

  it('returns inverse fallback rate for KZT to RUB', async () => {
    redisStoreService.getJson.mockResolvedValue(null);
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: false,
      } as Response);

    await expect(
      currencyService.getRate(Currency.KZT, Currency.RUB),
    ).resolves.toBeCloseTo(0.190476, 6);
  });
});

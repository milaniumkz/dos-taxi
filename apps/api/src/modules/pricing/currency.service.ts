import { Currency } from '@dos/shared-types';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisStoreService } from '../../shared/cache/redis-store.service';

type CachedCurrencyRate = {
  rate: number;
};

@Injectable()
export class CurrencyService {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisStoreService: RedisStoreService,
  ) {}

  async getRate(from: Currency, to: Currency): Promise<number> {
    if (from === to) {
      return 1;
    }

    const cacheKey = `currency:rate:${from}:${to}`;
    const cached =
      await this.redisStoreService.getJson<CachedCurrencyRate>(cacheKey);
    if (cached && typeof cached.rate === 'number' && cached.rate > 0) {
      return cached.rate;
    }

    const officialRate = await this.fetchOfficialRate(from, to);
    const rate = officialRate ?? this.getFallbackRate(from, to);
    await this.redisStoreService.setJson(cacheKey, { rate }, 3600);
    return rate;
  }

  private async fetchOfficialRate(
    from: Currency,
    to: Currency,
  ): Promise<number | null> {
    if (
      !(
        (from === Currency.RUB && to === Currency.KZT) ||
        (from === Currency.KZT && to === Currency.RUB)
      )
    ) {
      return null;
    }

    try {
      const response = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        Valute?: {
          KZT?: {
            Value?: number;
            Nominal?: number;
          };
        };
      };

      const kztValue = payload.Valute?.KZT?.Value;
      const kztNominal = payload.Valute?.KZT?.Nominal;
      if (
        typeof kztValue !== 'number' ||
        typeof kztNominal !== 'number' ||
        kztValue <= 0 ||
        kztNominal <= 0
      ) {
        return null;
      }

      const rubPerKzt = kztValue / kztNominal;
      if (from === Currency.RUB && to === Currency.KZT) {
        return Number((1 / rubPerKzt).toFixed(6));
      }

      return Number(rubPerKzt.toFixed(6));
    } catch {
      return null;
    }
  }

  private getFallbackRate(from: Currency, to: Currency): number {
    if (from === Currency.RUB && to === Currency.KZT) {
      return Number(
        this.configService.get<string>('CURRENCY_RUB_KZT_FALLBACK_RATE') ??
          '5.1',
      );
    }

    if (from === Currency.KZT && to === Currency.RUB) {
      const forwardRate = Number(
        this.configService.get<string>('CURRENCY_RUB_KZT_FALLBACK_RATE') ??
          '5.1',
      );
      return Number((1 / forwardRate).toFixed(6));
    }

    return 1;
  }
}

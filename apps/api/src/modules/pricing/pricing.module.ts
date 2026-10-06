import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisStoreService } from '../../shared/cache/redis-store.service';
import { CityEntity } from '../admin/entities/city.entity';
import { TariffEntity } from '../admin/entities/tariff.entity';

import { CurrencyService } from './currency.service';
import { PricingService } from './pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([CityEntity, TariffEntity])],
  providers: [PricingService, CurrencyService, RedisStoreService],
  exports: [PricingService, CurrencyService],
})
export class PricingModule {}

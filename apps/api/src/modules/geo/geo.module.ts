import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisStoreService } from '../../shared/cache/redis-store.service';
import { CityEntity } from '../admin/entities/city.entity';
import { ExecutorEntity } from '../executors/entities/executor.entity';

import { NominatimAdapter } from './adapters/nominatim.adapter';
import { OsrmAdapter } from './adapters/osrm.adapter';
import { YandexGeocoderAdapter } from './adapters/yandex-geocoder.adapter';
import { GeoController } from './geo.controller';
import { GeoService } from './geo.service';

@Module({
  imports: [TypeOrmModule.forFeature([CityEntity, ExecutorEntity])],
  controllers: [GeoController],
  providers: [
    GeoService,
    NominatimAdapter,
    OsrmAdapter,
    YandexGeocoderAdapter,
    RedisStoreService,
  ],
  exports: [GeoService],
})
export class GeoModule {}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { databaseEntities } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url:
          configService.get<string>('databaseUrl') ??
          configService.get<string>('DATABASE_URL'),
        autoLoadEntities: false,
        entities: databaseEntities,
        migrations: ['dist/database/migrations/*.js'],
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}

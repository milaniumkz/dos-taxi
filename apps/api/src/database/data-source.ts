import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { databaseEntities } from './entities';

const appDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://platform:platform@localhost:5432/platform_db',
  entities: databaseEntities,
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});

export default appDataSource;

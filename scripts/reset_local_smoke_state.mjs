#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const rootDir = resolve(new URL('..', import.meta.url).pathname);
const envPath = resolve(rootDir, 'apps/api/.env.local');
const requireFromApi = createRequire(resolve(rootDir, 'apps/api/package.json'));
const RedisModule = requireFromApi('ioredis');
const Redis = RedisModule.default ?? RedisModule;

function readEnvFile(path) {
  try {
    const env = {};
    for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

async function deleteByPattern(redis, pattern) {
  let deleted = 0;
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      pattern,
      'COUNT',
      200,
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== '0');

  return deleted;
}

const fileEnv = readEnvFile(envPath);
const redisUrl = process.env.REDIS_URL ?? fileEnv.REDIS_URL;

if (!redisUrl) {
  console.log('Local smoke Redis reset skipped: REDIS_URL is not configured');
  process.exit(0);
}

const devClientPhone =
  process.env.DEV_CLIENT_PHONE ?? fileEnv.DEV_CLIENT_PHONE ?? '+77000000002';
const devExecutorPhone =
  process.env.DEV_EXECUTOR_PHONE ?? fileEnv.DEV_EXECUTOR_PHONE ?? '+77000000003';
const devClientUserId =
  process.env.DEV_CLIENT_USER_ID ??
  fileEnv.DEV_CLIENT_USER_ID ??
  '00000000-0000-4000-8000-000000000002';
const devExecutorUserId =
  process.env.DEV_EXECUTOR_USER_ID ??
  fileEnv.DEV_EXECUTOR_USER_ID ??
  '00000000-0000-4000-8000-000000000003';

const redis = new Redis(redisUrl, {
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
});

try {
  const directKeys = [
    'auth:otp:rate:127.0.0.1',
    'auth:otp:rate:::1',
    'auth:otp:rate:::ffff:127.0.0.1',
    `auth:otp:${devClientPhone}`,
    `auth:otp:${devExecutorPhone}`,
    `auth:refresh:${devClientUserId}:client`,
    `auth:refresh:${devExecutorUserId}:executor`,
  ];

  let deleted = await redis.del(...directKeys);
  deleted += await deleteByPattern(redis, 'dispatch:queue:*');
  deleted += await deleteByPattern(redis, 'bull:dispatch-queue:*');

  console.log(`Local smoke Redis reset completed: deleted ${deleted} keys`);
} finally {
  await redis.quit();
}

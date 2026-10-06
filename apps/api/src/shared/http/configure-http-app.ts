import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

import { GlobalExceptionFilter } from '../filters/global-exception.filter';

import { requestLoggingMiddleware } from './request-logging.middleware';
import { traceIdMiddleware } from './trace-id.middleware';

type ConfigureHttpApplicationOptions = {
  apiPrefix?: string;
};

const defaultAllowedOrigins = [
  'https://dos-taxi.web.app',
  'https://dos-taxi.firebaseapp.com',
  'https://dos-taxi-passenger.web.app',
  'https://dos-taxi-passenger.firebaseapp.com',
  'https://dos-taxi-driver.web.app',
  'https://dos-taxi-driver.firebaseapp.com',
];

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!envOrigins) {
    return defaultAllowedOrigins;
  }

  return envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function configureHttpApplication(
  app: INestApplication,
  options?: ConfigureHttpApplicationOptions,
): INestApplication {
  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  });
  app.setGlobalPrefix(options?.apiPrefix ?? 'api/v1');
  app.use(traceIdMiddleware);
  app.use(requestLoggingMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  return app;
}

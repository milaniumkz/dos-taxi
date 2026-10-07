import { Logger } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import type { RequestWithTraceId } from './trace-id.middleware';

type HttpRequestLogger = Pick<LoggerService, 'log' | 'warn' | 'error'>;

const requestLogger = new Logger('HttpRequestLogger');

function resolveClientIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0]?.trim() ?? request.ip;
  }

  return request.ip || 'unknown-ip';
}

function selectLogMethod(
  logger: HttpRequestLogger,
  statusCode: number,
): (message: string) => void {
  if (statusCode >= 500) {
    return logger.error.bind(logger);
  }

  if (statusCode >= 400) {
    return logger.warn.bind(logger);
  }

  return logger.log.bind(logger);
}

export function createRequestLoggingMiddleware(logger: HttpRequestLogger) {
  return function requestLoggingMiddleware(
    request: RequestWithTraceId,
    response: Response,
    next: NextFunction,
  ): void {
    const startedAt = process.hrtime.bigint();

    response.once('finish', () => {
      const finishedAt = process.hrtime.bigint();
      const durationMs = Number(finishedAt - startedAt) / 1_000_000;
      const traceId = request.traceId ?? 'unknown-trace-id';
      const statusCode = response.statusCode;
      const path = (request.originalUrl || request.url).split('?')[0];
      const clientIp = resolveClientIp(request);
      const log = selectLogMethod(logger, statusCode);

      log(
        `${request.method} ${path} -> ${statusCode} ${durationMs.toFixed(
          1,
        )}ms traceId=${traceId} ip=${clientIp}`,
      );
    });

    next();
  };
}

export const requestLoggingMiddleware =
  createRequestLoggingMiddleware(requestLogger);

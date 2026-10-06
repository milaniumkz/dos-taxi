import { EventEmitter } from 'node:events';

import type { NextFunction, Response } from 'express';

import { createRequestLoggingMiddleware } from '../../src/shared/http/request-logging.middleware';
import type { RequestWithTraceId } from '../../src/shared/http/trace-id.middleware';

type MockLogger = {
  log: jest.Mock<void, [string]>;
  warn: jest.Mock<void, [string]>;
  error: jest.Mock<void, [string]>;
};

function createMockLogger(): MockLogger {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createMockRequest(
  overrides: Partial<RequestWithTraceId> = {},
): RequestWithTraceId {
  return {
    method: 'GET',
    url: '/api/v1/debug/ok',
    originalUrl: '/api/v1/debug/ok',
    ip: '127.0.0.1',
    headers: {},
    traceId: 'trace-123',
    ...overrides,
  } as RequestWithTraceId;
}

function createMockResponse(statusCode: number): Response {
  const response = new EventEmitter() as Response & EventEmitter;
  response.statusCode = statusCode;
  return response;
}

describe('request logging middleware', () => {
  it('logs successful requests at info level', () => {
    const logger = createMockLogger();
    const middleware = createRequestLoggingMiddleware(logger);
    const request = createMockRequest();
    const response = createMockResponse(200);
    const next: NextFunction = jest.fn();

    middleware(request, response, next);
    response.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/v1/debug/ok -> 200'),
    );
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('traceId=trace-123'),
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs client errors at warn level', () => {
    const logger = createMockLogger();
    const middleware = createRequestLoggingMiddleware(logger);
    const request = createMockRequest({
      method: 'POST',
      originalUrl: '/api/v1/orders',
      url: '/api/v1/orders',
    });
    const response = createMockResponse(400);

    middleware(request, response, jest.fn());
    response.emit('finish');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('POST /api/v1/orders -> 400'),
    );
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs server errors at error level and uses forwarded ip when present', () => {
    const logger = createMockLogger();
    const middleware = createRequestLoggingMiddleware(logger);
    const request = createMockRequest({
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.1',
      },
      originalUrl: '/api/v1/debug/crash',
      url: '/api/v1/debug/crash',
    });
    const response = createMockResponse(500);

    middleware(request, response, jest.fn());
    response.emit('finish');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/v1/debug/crash -> 500'),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('ip=203.0.113.10'),
    );
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

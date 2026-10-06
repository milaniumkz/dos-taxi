import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import {
  REQUEST_ID_HEADERS,
  TRACE_ID_HEADER,
} from './trace-id.constants';

export type RequestWithTraceId = Request & {
  traceId?: string;
};

function resolveTraceId(request: Request): string {
  for (const header of REQUEST_ID_HEADERS) {
    const rawValue = request.headers[header];
    if (typeof rawValue === 'string' && rawValue.trim()) {
      return rawValue.trim();
    }
  }

  return randomUUID();
}

export function traceIdMiddleware(
  request: RequestWithTraceId,
  response: Response,
  next: NextFunction,
): void {
  const traceId = resolveTraceId(request);
  request.traceId = traceId;
  response.setHeader(TRACE_ID_HEADER, traceId);
  next();
}

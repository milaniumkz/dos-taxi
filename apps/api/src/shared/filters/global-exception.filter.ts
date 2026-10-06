import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import {
  TRACE_ID_HEADER,
} from '../http/trace-id.constants';
import type {
  RequestWithTraceId,
} from '../http/trace-id.middleware';

type ErrorEnvelope = {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithTraceId>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const traceId = request.traceId ?? 'unknown-trace-id';
    const payload = this.normalizeException(exception, traceId, statusCode);

    response.setHeader(TRACE_ID_HEADER, traceId);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json(payload);
  }

  private normalizeException(
    exception: unknown,
    traceId: string,
    statusCode: number,
  ): ErrorEnvelope {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          code: this.defaultCode(statusCode),
          message: response,
          details: {},
          traceId,
        };
      }

      if (response && typeof response === 'object') {
        const responseObject = response as Record<string, unknown>;
        const message = responseObject.message;

        if (Array.isArray(message)) {
          return {
            code:
              typeof responseObject.code === 'string'
                ? responseObject.code
                : 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: {
              errors: message,
            },
            traceId,
          };
        }

        const details =
          responseObject.details &&
          typeof responseObject.details === 'object' &&
          !Array.isArray(responseObject.details)
            ? (responseObject.details as Record<string, unknown>)
            : this.extractDetails(responseObject);

        return {
          code:
            typeof responseObject.code === 'string'
              ? responseObject.code
              : this.defaultCode(statusCode),
          message:
            typeof message === 'string'
              ? message
              : exception.message,
          details,
          traceId,
        };
      }
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: {},
      traceId,
    };
  }

  private extractDetails(
    response: Record<string, unknown>,
  ): Record<string, unknown> {
    const entries = Object.entries(response).filter(
      ([key]) =>
        !['code', 'message', 'details', 'error', 'statusCode', 'traceId'].includes(
          key,
        ),
    );

    return Object.fromEntries(entries);
  }

  private defaultCode(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : `HTTP_${statusCode}`;
    }
  }
}

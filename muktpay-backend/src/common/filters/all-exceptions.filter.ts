import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorBody {
  statusCode: number;
  message: string | string[];
  code: string;
}

const GENERIC_500 = 'Something went wrong on our side. Please try again.';
const UNAVAILABLE = 'The service is temporarily unavailable. Please try again shortly.';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

const DB_CONNECTION_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']);
const DB_CONNECTION_MESSAGE = /timeout exceeded when trying to connect|connection terminated|connect ECONNREFUSED/i;

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/**
 * One response shape for every error, and nothing internal in it. Registered in app.setup.ts so
 * the e2e tests exercise exactly what production does.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      const path = (request.originalUrl ?? request.url ?? '').split('?')[0]; // never log query strings
      this.logger.error(
        `${request.method} ${path} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (response.headersSent) return;
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) return this.fromHttpException(exception);

    const error = asRecord(exception);

    // Database errors (TypeORM wraps the driver error in `driverError`).
    const driver = asRecord(error.driverError);
    const pgCode = typeof driver.code === 'string' ? driver.code : typeof error.code === 'string' ? error.code : undefined;
    const message = typeof error.message === 'string' ? error.message : '';

    switch (pgCode) {
      case '22001':
        return { statusCode: 400, code: 'VALUE_TOO_LONG', message: 'One of the values you entered is too long.' };
      case '22P02':
        return { statusCode: 400, code: 'INVALID_INPUT', message: 'One of the values you entered is not valid.' };
      case '23505':
        return { statusCode: 409, code: 'DUPLICATE', message: 'That already exists.' };
    }
    if (
      (pgCode && (pgCode.startsWith('08') || pgCode.startsWith('57P') || DB_CONNECTION_CODES.has(pgCode))) ||
      DB_CONNECTION_MESSAGE.test(message)
    ) {
      return { statusCode: 503, code: 'DATABASE_UNAVAILABLE', message: UNAVAILABLE };
    }

    // Errors from the body parser (malformed JSON, body too large) carry an HTTP status of their own.
    const status = typeof error.status === 'number' ? error.status : typeof error.statusCode === 'number' ? error.statusCode : 0;
    if (status >= 400 && status < 500) {
      if (error.type === 'entity.parse.failed') {
        return { statusCode: 400, code: 'MALFORMED_JSON', message: 'The request body is not valid JSON.' };
      }
      if (error.type === 'entity.too.large') {
        return { statusCode: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' };
      }
      return { statusCode: status, code: CODE_BY_STATUS[status] ?? 'BAD_REQUEST', message: 'Invalid request.' };
    }

    return { statusCode: 500, code: 'INTERNAL_ERROR', message: GENERIC_500 };
  }

  private fromHttpException(exception: HttpException): ErrorBody {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();
    const payload = asRecord(raw);

    let message: string | string[];
    if (typeof raw === 'string') message = raw;
    else if (Array.isArray(payload.message)) message = payload.message.map(String);
    else if (typeof payload.message === 'string') message = payload.message;
    else message = exception.message;

    if (statusCode === 500) message = GENERIC_500;
    if (statusCode === 429) message = 'Too many requests. Please try again later.';

    const code =
      typeof payload.code === 'string'
        ? payload.code
        : Array.isArray(message)
          ? 'VALIDATION_FAILED'
          : (CODE_BY_STATUS[statusCode] ?? (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'));

    return { statusCode, message, code };
  }
}
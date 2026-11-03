import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/** Health probes hit these every few seconds: logging them would drown everything else. */
const QUIET_PREFIXES = ['/api/health'];

/** A caller-supplied id is only trusted if it is short and made of safe characters. */
const SAFE_REQUEST_ID = /^[\w-]{8,64}$/;

/**
 * One access-log line per request: method, path, status, duration, client IP and a request id.
 *
 * The id is also returned in the `X-Request-Id` response header, so when a user reports a
 * problem you can find that exact request in the logs.
 *
 * Deliberately NOT logged: query strings, headers, request bodies. They can hold passwords,
 * tokens and payment details.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (QUIET_PREFIXES.some((prefix) => path.startsWith(prefix))) return;

    const ms = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6);
    const line = `${req.method} ${path} ${res.statusCode} ${ms}ms ip=${req.ip ?? '-'} id=${id}`;

    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });

  next();
}

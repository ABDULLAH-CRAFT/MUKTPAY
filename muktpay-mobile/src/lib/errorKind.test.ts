import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { classifyError } from './errorKind';
import { shouldRetryQuery } from './queryClient';

function httpError(status?: number) {
  const response = status ? ({ status, data: {}, statusText: '', headers: {}, config: {} } as never) : undefined;
  return new AxiosError('failed', status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK', undefined, undefined, response);
}

describe('classifyError', () => {
  it('tells network, auth, client and server failures apart', () => {
    expect(classifyError(httpError())).toBe('network');
    expect(classifyError(httpError(401))).toBe('auth');
    expect(classifyError(httpError(404))).toBe('client');
    expect(classifyError(httpError(429))).toBe('client');
    expect(classifyError(httpError(503))).toBe('server');
    expect(classifyError(new Error('boom'))).toBe('unknown');
  });
});

describe('shouldRetryQuery', () => {
  it('retries network and 5xx failures, at most twice', () => {
    expect(shouldRetryQuery(0, httpError())).toBe(true);
    expect(shouldRetryQuery(1, httpError(500))).toBe(true);
    expect(shouldRetryQuery(2, httpError())).toBe(false);
  });

  it('never retries 4xx', () => {
    expect(shouldRetryQuery(0, httpError(400))).toBe(false);
    expect(shouldRetryQuery(0, httpError(401))).toBe(false);
    expect(shouldRetryQuery(0, httpError(404))).toBe(false);
  });
});
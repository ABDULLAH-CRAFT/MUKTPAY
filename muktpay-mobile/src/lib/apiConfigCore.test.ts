import { describe, expect, it } from 'vitest';
import { resolveApiConfig } from './apiConfigCore';

describe('resolveApiConfig', () => {
  it('dev: prefers the explicit URL, then the LAN host, then localhost', () => {
    expect(resolveApiConfig({ isDev: true, explicitUrl: 'http://10.0.0.5:4000/api/' }).baseUrl).toBe(
      'http://10.0.0.5:4000/api',
    );
    expect(resolveApiConfig({ isDev: true, devHost: '192.168.1.9' }).baseUrl).toBe('http://192.168.1.9:4000/api');
    expect(resolveApiConfig({ isDev: true }).baseUrl).toBe('http://localhost:4000/api');
  });

  it('production: a missing URL is an error, never a localhost fallback', () => {
    const config = resolveApiConfig({ isDev: false, devHost: '192.168.1.9' });
    expect(config.error).toBeTruthy();
    expect(config.baseUrl).toBe('');
  });

  it('production: rejects http and local/private hosts', () => {
    expect(resolveApiConfig({ isDev: false, explicitUrl: 'http://api.example.com/api' }).error).toBeTruthy();
    expect(resolveApiConfig({ isDev: false, explicitUrl: 'https://localhost:4000/api' }).error).toBeTruthy();
    expect(resolveApiConfig({ isDev: false, explicitUrl: 'https://192.168.1.10/api' }).error).toBeTruthy();
    expect(resolveApiConfig({ isDev: false, explicitUrl: 'https://10.1.2.3:4000/api' }).error).toBeTruthy();
  });

  it('production: accepts a public https URL and trims trailing slashes', () => {
    const config = resolveApiConfig({ isDev: false, explicitUrl: 'https://api.muktpay.com/api/' });
    expect(config.error).toBeNull();
    expect(config.baseUrl).toBe('https://api.muktpay.com/api');
  });
});
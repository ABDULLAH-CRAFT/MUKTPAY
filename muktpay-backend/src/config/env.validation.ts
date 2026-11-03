import { parseCorsOrigins } from './runtime.config';

const ENVIRONMENTS = ['development', 'test', 'production'];
const REQUIRED = ['DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const;
const WEAK_DB_PASSWORDS = new Set(['muktpay_dev_password', 'postgres', 'password', 'admin', 'root', 'changeme', '123456']);
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const ORIGIN = /^https?:\/\/[^/\s]+$/i; // scheme + host (+port); no path, no trailing slash
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

// Fail fast at boot if configuration is missing or unsafe.
export function validateEnv(env: Record<string, unknown>) {
  const get = (key: string): string => {
    const value = env[key];
    return value === undefined || value === null ? '' : String(value).trim();
  };

  const nodeEnv = get('NODE_ENV');
  if (!ENVIRONMENTS.includes(nodeEnv)) {
    throw new Error(`NODE_ENV must be one of: ${ENVIRONMENTS.join(', ')} (got "${nodeEnv}")`);
  }
  const production = nodeEnv === 'production';

  const missing = REQUIRED.filter((key) => !get(key));
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  for (const key of ['PORT', 'DB_PORT', 'MAIL_PORT']) {
    const value = get(key);
    if (value && !(/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535)) {
      throw new Error(`${key} must be a port number between 1 and 65535`);
    }
  }

  for (const key of ['DB_MIGRATIONS_RUN', 'DB_SSL', 'DB_SSL_REJECT_UNAUTHORIZED', 'MAIL_SECURE']) {
    const value = get(key);
    if (value && value !== 'true' && value !== 'false') throw new Error(`${key} must be "true" or "false"`);
  }

  const origins = parseCorsOrigins(get('CORS_ORIGINS'));
  for (const origin of origins) {
    if (origin !== '*' && !ORIGIN.test(origin)) {
      throw new Error(`CORS_ORIGINS entry "${origin}" must look like https://app.example.com (no path or trailing slash)`);
    }
  }

  if (!production) return env;

  // ---- production only ----------------------------------------------------------------------

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const secret = get(key);
    if (secret.length < 32 || /change-?me|dev-only/i.test(secret)) {
      throw new Error(`${key} must be a random string of at least 32 characters in production`);
    }
  }
  if (get('JWT_ACCESS_SECRET') === get('JWT_REFRESH_SECRET')) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  const dbPassword = get('DB_PASSWORD');
  if (dbPassword.length < 12 || WEAK_DB_PASSWORDS.has(dbPassword.toLowerCase()) || /change-?me|dev/i.test(dbPassword)) {
    throw new Error('DB_PASSWORD looks like a development password. Use a strong, unique password (12+ characters) in production');
  }

  const dbHost = get('DB_HOST') || 'localhost';
  if (!LOCAL_DB_HOSTS.has(dbHost) && !get('DB_SSL')) {
    throw new Error('DB_HOST is a remote database: set DB_SSL=true (or DB_SSL=false explicitly if the network is private)');
  }

  for (const origin of origins) {
    if (origin === '*') throw new Error('CORS_ORIGINS must not contain "*" in production: list the exact web origins');
    if (LOCAL_ORIGIN.test(origin)) throw new Error(`CORS_ORIGINS contains a development origin (${origin}); remove it in production`);
    if (origin.toLowerCase().startsWith('http://')) throw new Error(`CORS_ORIGINS entry ${origin} must use https:// in production`);
  }

  // Password reset and email verification send real emails: without a mail server nobody gets a code.
  if (!get('MAIL_HOST') || !get('MAIL_FROM')) {
    throw new Error('MAIL_HOST and MAIL_FROM are required in production (verification and password reset codes are sent by email)');
  }
  if (/change-?me/i.test(get('MAIL_HOST')) || /change-?me/i.test(get('MAIL_FROM'))) {
    throw new Error('MAIL_HOST / MAIL_FROM still contain a "change-me" placeholder: set your real SMTP host and sender address');
  }
  if (/mailtrap\.io$/i.test(get('MAIL_HOST')) && /sandbox/i.test(get('MAIL_HOST'))) {
    throw new Error('MAIL_HOST is a Mailtrap sandbox, which never delivers email. Use a real SMTP provider in production');
  }

  if (get('TRUST_PROXY').toLowerCase() === 'true') {
    throw new Error('TRUST_PROXY=true lets any client spoof its IP. Use the number of proxies in front of the API, e.g. TRUST_PROXY=1');
  }

  return env;
}
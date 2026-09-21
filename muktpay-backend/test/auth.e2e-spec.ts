import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const api = () => request(app.getHttpServer());

  // unique per run so tests never collide with existing rows
  const run = Date.now();
  const email = `auth.test.${run}@example.com`;
  const password = 'Passw0rd123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['auth.test.%@example.com']);
    await app.close();
  });

  const register = (overrides: Record<string, unknown> = {}) =>
    api().post('/api/auth/register').send({ name: 'Test User', email, password, ...overrides });

  describe('registration', () => {
    it('creates a user, normalises the email and returns tokens (never the hash)', async () => {
      const res = await register({ email: `  ${email.toUpperCase()}  ` }).expect(201);
      expect(res.body.user).toMatchObject({ name: 'Test User', email });
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
    });

    it('stores a bcrypt hash, not the password', async () => {
      const [row] = await dataSource.query('SELECT password_hash FROM users WHERE email = $1', [email]);
      expect(row.password_hash).toMatch(/^\$2[aby]\$/);
      expect(row.password_hash).not.toContain(password);
    });

    it('rejects a duplicate email with 409', () => register().expect(409));

    it.each([
      ['short password', { password: 'abc1' }],
      ['password without a number', { password: 'onlyletters' }],
      ['password without a letter', { password: '12345678' }],
      ['invalid email', { email: 'not-an-email' }],
      ['too-short name', { name: 'A' }],
      ['unknown extra field', { role: 'admin' }],
    ])('rejects %s with 400', (_label, overrides) => register(overrides).expect(400));
  });

  describe('login', () => {
    it('logs in with correct credentials', async () => {
      const res = await api().post('/api/auth/login').send({ email, password }).expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await api().post('/api/auth/login').send({ email, password: 'Wrong12345' }).expect(401);
      const unknownEmail = await api().post('/api/auth/login').send({ email: `nobody.${run}@example.com`, password }).expect(401);
      expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    it('blocks deactivated accounts', async () => {
      await dataSource.query('UPDATE users SET is_active = false WHERE email = $1', [email]);
      await api().post('/api/auth/login').send({ email, password }).expect(401);
      await dataSource.query('UPDATE users SET is_active = true WHERE email = $1', [email]);
    });
  });

  describe('protected routes', () => {
    let accessToken: string;
    beforeAll(async () => {
      accessToken = (await api().post('/api/auth/login').send({ email, password })).body.accessToken;
    });

    it('rejects requests without a token', () => api().get('/api/users/me').expect(401));
    it('rejects a garbage token', () => api().get('/api/users/me').set('Authorization', 'Bearer nope').expect(401));
    it('rejects a refresh token used as an access token', async () => {
      const { refreshToken } = (await api().post('/api/auth/login').send({ email, password })).body;
      await api().get('/api/users/me').set('Authorization', `Bearer ${refreshToken}`).expect(401);
    });
    it('returns the profile for a valid token', async () => {
      const res = await api().get('/api/users/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
      expect(res.body).toMatchObject({ email, name: 'Test User' });
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('refresh tokens', () => {
    const login = async () => (await api().post('/api/auth/login').send({ email, password }).expect(200)).body;
    const refresh = (refreshToken: string) => api().post('/api/auth/refresh').send({ refreshToken });

    it('rotates: a new pair is issued and the old token stops working', async () => {
      const first = await login();
      const second = (await refresh(first.refreshToken).expect(200)).body;
      expect(second.refreshToken).not.toBe(first.refreshToken);
      await api().get('/api/users/me').set('Authorization', `Bearer ${second.accessToken}`).expect(200);
      await refresh(first.refreshToken).expect(401);
    });

    it('detects replay of a used token and revokes every session of that user', async () => {
      const first = await login();
      const second = (await refresh(first.refreshToken).expect(200)).body;
      await refresh(first.refreshToken).expect(401); // replay
      await refresh(second.refreshToken).expect(401); // legitimate newer token is now dead too
    });

    it('rejects a tampered token', async () => {
      const { refreshToken } = await login();
      await refresh(`${refreshToken}x`).expect(401);
    });

    it('stores only a hash of each token', async () => {
      const { refreshToken } = await login();
      const rows = await dataSource.query('SELECT token_hash FROM refresh_tokens');
      expect(rows.some((r: { token_hash: string }) => r.token_hash === refreshToken)).toBe(false);
      expect(rows.every((r: { token_hash: string }) => /^[0-9a-f]{64}$/.test(r.token_hash))).toBe(true);
    });
  });

  describe('logout', () => {
    it('revokes the refresh token and is idempotent', async () => {
      const { refreshToken } = (await api().post('/api/auth/login').send({ email, password })).body;
      await api().post('/api/auth/logout').send({ refreshToken }).expect(204);
      await api().post('/api/auth/refresh').send({ refreshToken }).expect(401);
      await api().post('/api/auth/logout').send({ refreshToken }).expect(204);
      await api().post('/api/auth/logout').send({ refreshToken: 'garbage' }).expect(204);
    });

    it('logout-all revokes every session', async () => {
      const a = (await api().post('/api/auth/login').send({ email, password })).body;
      const b = (await api().post('/api/auth/login').send({ email, password })).body;
      await api().post('/api/auth/logout-all').set('Authorization', `Bearer ${a.accessToken}`).expect(204);
      await api().post('/api/auth/refresh').send({ refreshToken: a.refreshToken }).expect(401);
      await api().post('/api/auth/refresh').send({ refreshToken: b.refreshToken }).expect(401);
    });
  });
});

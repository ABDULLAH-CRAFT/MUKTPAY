import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('Account lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const api = () => request(app.getHttpServer());

  const run = Date.now();
  const email = `account.test.${run}@example.com`;
  const password = 'Passw0rd123';
  let accessToken = '';
  let userId = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);

    const res = await api().post('/api/auth/register').send({ name: 'Account Test', email, password }).expect(201);
    accessToken = res.body.accessToken;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['account.test.%@example.com']);
    await app.close();
  });

  it('reports a new user as not verified', async () => {
    const res = await api().get('/api/users/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(res.body.emailVerified).toBe(false);
  });

  describe('forgot password', () => {
    it('answers the same for a known and an unknown email', async () => {
      const known = await api().post('/api/auth/forgot-password').send({ email }).expect(200);
      const unknown = await api().post('/api/auth/forgot-password').send({ email: `nobody.${run}@example.com` }).expect(200);
      expect(known.body).toEqual(unknown.body);
    });

    it('rejects a wrong code without changing the password', async () => {
      await api()
        .post('/api/auth/reset-password')
        .send({ email, code: '000000', newPassword: 'NewPassw0rd123' })
        .expect(400);
      await api().post('/api/auth/login').send({ email, password }).expect(200);
    });

    it.each([
      ['a code that is not 6 digits', { code: '12345' }],
      ['a weak new password', { newPassword: 'short' }],
    ])('rejects %s with 400', (_label, overrides) =>
      api()
        .post('/api/auth/reset-password')
        .send({ email, code: '123456', newPassword: 'NewPassw0rd123', ...overrides })
        .expect(400),
    );
  });

  describe('email verification', () => {
    it('rejects a wrong code', () =>
      api().post('/api/auth/verify-email').set('Authorization', `Bearer ${accessToken}`).send({ code: '000000' }).expect(400));

    it('needs a logged-in user', () => api().post('/api/auth/verify-email').send({ code: '123456' }).expect(401));
  });

  describe('delete account', () => {
    it('needs a logged-in user', () => api().post('/api/auth/delete-account').send({ password }).expect(401));

    it('refuses a wrong password and keeps the account', async () => {
      await api()
        .post('/api/auth/delete-account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'Wrong12345' })
        .expect(403);
      await api().post('/api/auth/login').send({ email, password }).expect(200);
    });

    it('deletes the account and everything that belongs to it', async () => {
      await api()
        .post('/api/auth/delete-account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password })
        .expect(204);

      await api().post('/api/auth/login').send({ email, password }).expect(401);

      const [users] = await dataSource.query('SELECT count(*)::int AS n FROM users WHERE id = $1', [userId]);
      const [tokens] = await dataSource.query('SELECT count(*)::int AS n FROM refresh_tokens WHERE user_id = $1', [userId]);
      const [codes] = await dataSource.query('SELECT count(*)::int AS n FROM auth_codes WHERE user_id = $1', [userId]);
      expect([users.n, tokens.n, codes.n]).toEqual([0, 0, 0]);
    });
  });
});

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.setup';

describe('Split preview (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let token: string;
  const email = `split.test.${Date.now()}@example.com`;

  const preview = (body: object) =>
    request(app.getHttpServer()).post('/api/split/preview').set('Authorization', `Bearer ${token}`).send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Split Tester', email, password: 'Passw0rd123' });
    token = res.body.accessToken;
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM users WHERE email LIKE $1', ['split.test.%@example.com']);
    await app.close();
  });

  it('requires a login', () => request(app.getHttpServer()).post('/api/split/preview').send({ totalPaise: 100 }).expect(401));

  it('splits ₹6,800 exactly as in the plan', async () => {
    const res = await preview({ totalPaise: 680000 }).expect(200);
    expect(res.body.trancheCount).toBe(4);
    expect(res.body.tranches).toEqual([
      { index: 1, amountPaise: 199900 },
      { index: 2, amountPaise: 199900 },
      { index: 3, amountPaise: 199900 },
      { index: 4, amountPaise: 80300 },
    ]);
    expect(res.body.warnings[0]).toMatch(/4 separate UPI payments/);
  });

  it('returns a single payment with no warnings when the bill is small', async () => {
    const res = await preview({ totalPaise: 150000 }).expect(200);
    expect(res.body.trancheCount).toBe(1);
    expect(res.body.warnings).toEqual([]);
  });

  it('supports the balanced strategy', async () => {
    const res = await preview({ totalPaise: 680000, strategy: 'balanced' }).expect(200);
    expect(res.body.tranches.map((t: { amountPaise: number }) => t.amountPaise)).toEqual([170000, 170000, 170000, 170000]);
  });

  it('lets a caller lower the cap', async () => {
    const res = await preview({ totalPaise: 500000, maxTranchePaise: 100000 }).expect(200);
    expect(res.body.trancheCount).toBe(5);
  });

  it('never lets a caller raise the cap above the server limit', async () => {
    const res = await preview({ totalPaise: 400000, maxTranchePaise: 199999 }).expect(200);
    for (const t of res.body.tranches) expect(t.amountPaise).toBeLessThanOrEqual(199900);
  });

  it('explains when a bill needs too many payments', async () => {
    const res = await preview({ totalPaise: 199900 * 20 + 1 }).expect(400);
    expect(res.body.code).toBe('TOO_MANY_TRANCHES');
    expect(res.body.message).toMatch(/most allowed is 20/);
  });

  it.each([
    ['zero total', { totalPaise: 0 }],
    ['negative total', { totalPaise: -5 }],
    ['fractional total', { totalPaise: 10.5 }],
    ['string total', { totalPaise: '1000' }],
    ['missing total', {}],
    ['cap of ₹2,000 (not under ₹2,000)', { totalPaise: 5000, maxTranchePaise: 200000 }],
    ['cap below ₹100', { totalPaise: 5000, maxTranchePaise: 5000 }],
    ['unknown strategy', { totalPaise: 5000, strategy: 'random' }],
    ['unknown field', { totalPaise: 5000, randomize: true }],
  ])('rejects %s with 400', (_label, body) => preview(body).expect(400));
});

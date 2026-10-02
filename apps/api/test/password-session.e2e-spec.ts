import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import { ApiExceptionFilter, validationExceptionFactory } from '@core/backend-core';
import { configureHttp } from '../src/bootstrap/configure-http.js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@core/auth';
import {
  AuthModule,
  type SessionDelegate,
  type SessionRefreshRecord,
  type SessionUserRecord,
} from '@core/auth/nest';
import { demoUserMiddleware } from '../src/common/middleware/demo-user.middleware.js';
import { AppModule } from '../src/app.module.js';

/**
 * In-memory stand-in for the Prisma accessors the app passes into auth.
 * It answers the delegate calls. Tests observe sessions only through HTTP.
 */
function createFakeDelegate(): SessionDelegate {
  const users: SessionUserRecord[] = [];
  const refreshTokens: SessionRefreshRecord[] = [];

  function matches(row: object, where: object): boolean {
    const clause = where as { OR?: object[] };
    if (Array.isArray(clause.OR)) return clause.OR.some((entry) => matches(row, entry));
    const record = row as unknown as Record<string, unknown>;
    return Object.entries(where).every(([key, value]) => record[key] === value);
  }

  return {
    users: {
      async findFirst(args) {
        return users.find((row) => matches(row, args.where)) ?? null;
      },
      async create(args) {
        const now = new Date();
        const row: SessionUserRecord = {
          id: randomUUID(),
          email: args.data.email,
          phone: args.data.phone,
          passwordHash: args.data.passwordHash,
          createdAt: now,
          updatedAt: now,
        };
        users.push(row);
        return row;
      },
    },
    refreshTokens: {
      async findFirst(args) {
        return refreshTokens.find((row) => matches(row, args.where)) ?? null;
      },
      async create(args) {
        const row: SessionRefreshRecord = {
          id: randomUUID(),
          userId: args.data.userId,
          tokenHash: args.data.tokenHash,
          expiresAt: args.data.expiresAt,
          revokedAt: null,
          createdAt: new Date(),
        };
        refreshTokens.push(row);
        return row;
      },
      async update(args) {
        const row = refreshTokens.find((entry) => entry.id === args.where.id);
        if (!row) throw new Error(`refresh token ${args.where.id} not found`);
        row.revokedAt = args.data.revokedAt;
        return row;
      },
    },
  };
}

function setCookies(res: Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function cookieValue(res: Response, name: string): string | undefined {
  const line = setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
  if (!line) return undefined;
  const value = line.slice(name.length + 1).split(';')[0];
  return value === '' ? undefined : value;
}

function cookieHas(res: Response, name: string, attribute: RegExp): boolean {
  const line = setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
  return line ? attribute.test(line) : false;
}

function cookieCleared(res: Response, name: string): boolean {
  const line = setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
  if (!line) return false;
  return new RegExp(`^${name}=;`).test(line);
}

function bearer(res: Response, name: string): string {
  const value = cookieValue(res, name);
  if (!value) throw new Error(`missing ${name} cookie`);
  return `${name}=${value}`;
}

async function createApp(
  delegate: SessionDelegate = createFakeDelegate(),
  http?: { loginRateLimit?: number },
): Promise<INestApplication> {
  const mod = await Test.createTestingModule({
    imports: [
      AuthModule.forRoot({
        users: delegate.users,
        refreshTokens: delegate.refreshTokens,
        accessSecret: 'test-access-secret',
        refreshSecret: 'test-refresh-secret',
        accessTtl: '15m',
        refreshTtl: '7d',
      }),
    ],
  }).compile();

  const app = mod.createNestApplication();
  app.use(demoUserMiddleware);
  configureHttp(app, http);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  await app.init();
  return app;
}

describe('password session (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('registering with an email and a password sets the access and refresh cookies', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.email).toBe('ada@example.com');
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(cookieValue(res, ACCESS_TOKEN_COOKIE)).toBeTruthy();
    expect(cookieValue(res, REFRESH_TOKEN_COOKIE)).toBeTruthy();
    expect(cookieHas(res, REFRESH_TOKEN_COOKIE, /HttpOnly/i)).toBe(true);
    expect(cookieHas(res, REFRESH_TOKEN_COOKIE, /(?:^|; )Path=\/(?:;|$)/)).toBe(true);
  });

  it('registering with a phone and a password sets both cookies', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ phone: '+15551212000', password: 'correct horse' })
      .expect(201);

    expect(res.body.data.phone).toBe('+15551212000');
    expect(res.body.data.email).toBeNull();
    expect(cookieValue(res, ACCESS_TOKEN_COOKIE)).toBeTruthy();
    expect(cookieValue(res, REFRESH_TOKEN_COOKIE)).toBeTruthy();
  });

  it('refuses registration when neither email nor phone is sent', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ password: 'correct horse' })
      .expect(400);

    expect(res.body.status).toBe('error');
    expect(cookieValue(res, ACCESS_TOKEN_COOKIE)).toBeUndefined();
  });

  it('refuses a duplicate email or phone', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    await request(server)
      .post('/auth/register')
      .send({ email: 'Ada@example.com', phone: '+15551212001', password: 'correct horse' })
      .expect(201);

    const email = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'another horse' })
      .expect(409);
    expect(email.body.status).toBe('error');

    const phone = await request(server)
      .post('/auth/register')
      .send({ phone: '+15551212001', password: 'another horse' })
      .expect(409);
    expect(phone.body.status).toBe('error');
  });

  it('sets both cookies for the right password and none for the wrong password', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const wrong = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'nope' })
      .expect(401);
    expect(wrong.body.status).toBe('error');
    expect(cookieValue(wrong, ACCESS_TOKEN_COOKIE)).toBeUndefined();
    expect(cookieValue(wrong, REFRESH_TOKEN_COOKIE)).toBeUndefined();

    const right = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(cookieValue(right, ACCESS_TOKEN_COOKIE)).toBeTruthy();
    expect(cookieValue(right, REFRESH_TOKEN_COOKIE)).toBeTruthy();

    await request(server)
      .post('/auth/register')
      .send({ phone: '+15551212002', password: 'phone secret' })
      .expect(201);
    const byPhone = await request(server)
      .post('/auth/login')
      .send({ phone: '+15551212002', password: 'phone secret' })
      .expect(200);
    expect(cookieValue(byPhone, ACCESS_TOKEN_COOKIE)).toBeTruthy();
    expect(cookieValue(byPhone, REFRESH_TOKEN_COOKIE)).toBeTruthy();
  });

  it('rotates a valid refresh token and refuses an unknown or already used one', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const original = cookieValue(registered, REFRESH_TOKEN_COOKIE);

    const refreshed = await request(server)
      .post('/auth/refresh')
      .set('Cookie', bearer(registered, REFRESH_TOKEN_COOKIE))
      .expect(200);
    expect(cookieValue(refreshed, ACCESS_TOKEN_COOKIE)).toBeTruthy();
    const rotated = cookieValue(refreshed, REFRESH_TOKEN_COOKIE);
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(original);

    const reused = await request(server)
      .post('/auth/refresh')
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=${original}`)
      .expect(401);
    expect(reused.body.status).toBe('error');

    const unknown = await request(server)
      .post('/auth/refresh')
      .set('Cookie', `${REFRESH_TOKEN_COOKIE}=not-a-session`)
      .expect(401);
    expect(unknown.body.status).toBe('error');

    await request(server)
      .post('/auth/refresh')
      .set('Cookie', bearer(refreshed, REFRESH_TOKEN_COOKIE))
      .expect(200);
  });

  it('logout clears both cookies and the old refresh token cannot be reused', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const loggedOut = await request(server)
      .post('/auth/logout')
      .set('Cookie', bearer(registered, REFRESH_TOKEN_COOKIE))
      .expect(200);
    expect(cookieCleared(loggedOut, ACCESS_TOKEN_COOKIE)).toBe(true);
    expect(cookieCleared(loggedOut, REFRESH_TOKEN_COOKIE)).toBe(true);

    await request(server)
      .post('/auth/refresh')
      .set('Cookie', bearer(registered, REFRESH_TOKEN_COOKIE))
      .expect(401);
  });

  it('returns the signed-in profile and ignores the demo user when no session is present', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    const anonymous = await request(server).get('/auth/me').expect(401);
    expect(anonymous.body.status).toBe('error');
    expect(anonymous.body.data).toBeNull();

    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const profile = await request(server)
      .get('/auth/me')
      .set('Cookie', bearer(registered, ACCESS_TOKEN_COOKIE))
      .expect(200);
    expect(profile.body.status).toBe('success');
    expect(profile.body.data.email).toBe('ada@example.com');
    expect(profile.body.data.id).not.toBe('demo');
  });

  it('sends the Helmet nosniff header on responses', async () => {
    app = await createApp();
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rate limits repeated password sign-in and does not limit other routes', async () => {
    app = await createApp(createFakeDelegate(), { loginRateLimit: 2 });
    const server = app.getHttpServer();

    await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    await request(server).post('/auth/login').send({ email: 'ada@example.com', password: 'nope' }).expect(401);
    await request(server).post('/auth/login').send({ email: 'ada@example.com', password: 'nope' }).expect(401);

    const limited = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(429);
    expect(limited.body.status).toBe('error');

    await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    await request(server).get('/auth/me').expect(401);
  });
});

describe('items stay open without a session (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates and lists an item without signing in', async () => {
    const sku = `SKU-AUTH-${Date.now()}`;
    const server = app.getHttpServer();

    const create = await request(server)
      .post('/example/items')
      .send({ name: { ar: 'منتج', en: 'Item' }, sku, price: 10 })
      .expect(201);
    expect(create.body.status).toBe('success');
    expect(create.body.data.sku).toBe(sku);

    const list = await request(server).get('/example/items').expect(200);
    expect(list.body.status).toBe('success');
    expect(list.body.data.some((item: { sku: string }) => item.sku === sku)).toBe(true);

    const id = create.body.data.id;
    if (typeof id !== 'string') throw new Error('created item is missing an id');
    await request(server).delete(`/example/items/${id}`).expect(204);
  });
});

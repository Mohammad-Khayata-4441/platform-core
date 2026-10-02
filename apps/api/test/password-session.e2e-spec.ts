import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import { ApiExceptionFilter, validationExceptionFactory } from '@core/backend-core';
import { configureHttp } from '../src/bootstrap/configure-http.js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@core/auth';
import {
  AuthModule,
  type PermissionRecord,
  type RolePermissionRecord,
  type RoleRecord,
  type SessionDelegate,
  type SessionRefreshRecord,
  type SessionUserRecord,
  type UserRoleRecord,
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
  const permissions: PermissionRecord[] = [];
  const roles: RoleRecord[] = [];
  const rolePermissions: RolePermissionRecord[] = [];
  const userRoles: UserRoleRecord[] = [];
  /** Registration lookups that have not claimed a role yet. */
  let openRegistrations = 0;
  const claimArrivals: Array<() => void> = [];
  let lockArrivals = 0;
  const lockWaiters: Array<() => void> = [];
  const txStorage = new AsyncLocalStorage<{ releases: Array<() => void> }>();
  const roleTail = new Map<string, Promise<void>>();

  function acquireRole(id: string): Promise<() => void> {
    const previous = roleTail.get(id) ?? Promise.resolve();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    roleTail.set(
      id,
      previous.then(() => gate),
    );
    return previous.then(() => release);
  }

  function holdsRoleLock(): boolean {
    const state = txStorage.getStore();
    return state !== undefined && state.releases.length > 0;
  }

  function matches(row: object, where: object): boolean {
    const clause = where as { OR?: object[] };
    if (Array.isArray(clause.OR)) return clause.OR.some((entry) => matches(row, entry));
    const record = row as unknown as Record<string, unknown>;
    return Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && 'notIn' in value) {
        const excluded = (value as { notIn: unknown[] }).notIn;
        return !excluded.includes(record[key]);
      }
      return record[key] === value;
    });
  }

  const stores: Omit<SessionDelegate, 'transaction'> = {
    users: {
      async findFirst(args) {
        const registration = Array.isArray((args.where as { OR?: unknown }).OR);
        if (registration) openRegistrations++;
        const row = users.find((entry) => matches(entry, args.where)) ?? null;
        if (registration && row) openRegistrations--;
        return row;
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
    permissions: {
      async findMany() {
        return [...permissions];
      },
      async upsert(args) {
        const existing = permissions.find((row) => row.key === args.where.key);
        if (existing) return existing;
        const now = new Date();
        const row: PermissionRecord = {
          id: randomUUID(),
          key: args.create.key,
          createdAt: now,
          updatedAt: now,
        };
        permissions.push(row);
        return row;
      },
    },
    roles: {
      async findFirst(args) {
        return roles.find((row) => matches(row, args.where)) ?? null;
      },
      async create(args) {
        if (roles.some((row) => row.slug === args.data.slug)) {
          throw new Error(`role slug ${args.data.slug} already exists`);
        }
        const now = new Date();
        const row: RoleRecord = {
          id: randomUUID(),
          slug: args.data.slug,
          label: args.data.label,
          createdAt: now,
          updatedAt: now,
        };
        roles.push(row);
        return row;
      },
      async update(args) {
        lockArrivals++;
        for (const waiter of lockWaiters.splice(0)) waiter();
        const release = await acquireRole(args.where.id);
        const state = txStorage.getStore();
        if (state) state.releases.push(release);
        else release();
        const row = roles.find((entry) => entry.id === args.where.id);
        if (!row) throw new Error(`role ${args.where.id} not found`);
        row.slug = args.data.slug;
        row.updatedAt = new Date();
        return row;
      },
    },
    rolePermissions: {
      async findMany(args) {
        return rolePermissions.filter((row) => matches(row, args.where));
      },
      async create(args) {
        if (
          rolePermissions.some(
            (row) => row.roleId === args.data.roleId && row.permissionId === args.data.permissionId,
          )
        ) {
          throw new Error('role permission already exists');
        }
        const row: RolePermissionRecord = {
          roleId: args.data.roleId,
          permissionId: args.data.permissionId,
        };
        rolePermissions.push(row);
        return row;
      },
      async deleteMany(args) {
        const kept = rolePermissions.filter((row) => !matches(row, args.where));
        const count = rolePermissions.length - kept.length;
        rolePermissions.splice(0, rolePermissions.length, ...kept);
        return { count };
      },
    },
    userRoles: {
      async findMany(args) {
        return userRoles.filter((row) => matches(row, args.where));
      },
      async count(args) {
        // Password hashing finishes one registration before the other reaches this
        // read. Without the owner-row lock, wait until every in-flight registration
        // reads. With the lock, wait until the others have arrived at `roles.update`
        // and then read while still holding that lock.
        const cohort = openRegistrations;
        if (holdsRoleLock()) {
          if (cohort > 1 && lockArrivals < cohort) {
            await new Promise<void>((resolve) => {
              const check = () => {
                if (lockArrivals >= cohort) resolve();
                else lockWaiters.push(check);
              };
              check();
            });
          }
        } else if (cohort > 1) {
          await new Promise<void>((resolve) => {
            claimArrivals.push(resolve);
            if (claimArrivals.length >= cohort) {
              const pending = claimArrivals.splice(0);
              for (const done of pending) done();
            }
          });
        }
        const count = userRoles.filter((row) => matches(row, args.where)).length;
        openRegistrations = Math.max(0, openRegistrations - 1);
        return count;
      },
      async create(args) {
        if (userRoles.some((row) => row.userId === args.data.userId && row.roleId === args.data.roleId)) {
          throw new Error('user role already exists');
        }
        const row: UserRoleRecord = { userId: args.data.userId, roleId: args.data.roleId };
        userRoles.push(row);
        return row;
      },
    },
  };

  return {
    ...stores,
    async transaction(run) {
      const state = { releases: [] as Array<() => void> };
      try {
        return await txStorage.run(state, () => run(stores));
      } finally {
        for (const release of state.releases.splice(0)) release();
      }
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

function accessClaims(res: Response): { roles: string[]; permissions: string[] } {
  const token = cookieValue(res, ACCESS_TOKEN_COOKIE);
  if (!token) throw new Error('missing access token');
  const body = token.split('.')[1];
  if (!body) throw new Error('missing access token payload');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
    roles?: unknown;
    permissions?: unknown;
  };
  return {
    roles: Array.isArray(payload.roles) ? payload.roles.filter((role) => typeof role === 'string') : [],
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission) => typeof permission === 'string')
      : [],
  };
}

async function createApp(
  delegate: SessionDelegate = createFakeDelegate(),
  options?: { loginRateLimit?: number; extraPermissions?: string[] },
): Promise<INestApplication> {
  const mod = await Test.createTestingModule({
    imports: [
      AuthModule.forRoot({
        users: delegate.users,
        refreshTokens: delegate.refreshTokens,
        permissions: delegate.permissions,
        roles: delegate.roles,
        rolePermissions: delegate.rolePermissions,
        userRoles: delegate.userRoles,
        transaction: (run) => delegate.transaction(run),
        extraPermissions: options?.extraPermissions,
        accessSecret: 'test-access-secret',
        refreshSecret: 'test-refresh-secret',
        accessTtl: '15m',
        refreshTtl: '7d',
      }),
    ],
  }).compile();

  const app = mod.createNestApplication();
  app.use(demoUserMiddleware);
  configureHttp(app, options);
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

const CORE_PERMISSIONS = [
  'users.read',
  'users.update',
  'users.deactivate',
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.assign',
  'files.create',
  'files.read',
  'files.delete',
];

describe('owner role (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('gives the first registered user the owner role and the core permission catalog', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const claims = accessClaims(res);
    expect(claims.roles).toEqual(['owner']);
    expect(claims.permissions.slice().sort()).toEqual([...CORE_PERMISSIONS].sort());
  });

  it('stores a product permission key next to the core catalog', async () => {
    app = await createApp(createFakeDelegate(), { extraPermissions: ['orders.read'] });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const claims = accessClaims(res);
    expect(claims.roles).toEqual(['owner']);
    expect(claims.permissions.slice().sort()).toEqual([...CORE_PERMISSIONS, 'orders.read'].sort());
  });

  it('gives the second registered user no role and no permissions', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const second = await request(server)
      .post('/auth/register')
      .send({ phone: '+15551212', password: 'correct horse' })
      .expect(201);

    const claims = accessClaims(second);
    expect(claims.roles).toEqual([]);
    expect(claims.permissions).toEqual([]);
  });

  it('leaves exactly one owner when two registrations race', async () => {
    app = await createApp();
    const server = app.getHttpServer();

    const [first, second] = await Promise.all([
      request(server).post('/auth/register').send({ email: 'ada@example.com', password: 'correct horse' }),
      request(server).post('/auth/register').send({ email: 'grace@example.com', password: 'correct horse' }),
    ]);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const claims = [accessClaims(first), accessClaims(second)];
    const owners = claims.filter((entry) => entry.roles.includes('owner'));
    expect(owners).toHaveLength(1);
    expect(owners[0]?.permissions.slice().sort()).toEqual([...CORE_PERMISSIONS].sort());
    const other = claims.find((entry) => !entry.roles.includes('owner'));
    expect(other?.roles).toEqual([]);
    expect(other?.permissions).toEqual([]);
  });

  it('rewrites owner grants on the next boot and leaves another role alone', async () => {
    const delegate = createFakeDelegate();
    app = await createApp(delegate, { extraPermissions: ['orders.read'] });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const grace = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);

    const orders = (await delegate.permissions.findMany()).find((permission) => permission.key === 'orders.read');
    if (!orders) throw new Error('orders.read was not stored');
    const clerk = await delegate.roles.create({ data: { slug: 'clerk', label: { en: 'Clerk' } } });
    await delegate.rolePermissions.create({ data: { roleId: clerk.id, permissionId: orders.id } });
    await delegate.userRoles.create({ data: { userId: grace.body.data.id as string, roleId: clerk.id } });

    await app.close();
    app = await createApp(delegate, { extraPermissions: ['billing.read'] });
    const server = app.getHttpServer();

    const owner = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    const ownerClaims = accessClaims(owner);
    expect(ownerClaims.roles).toEqual(['owner']);
    expect(ownerClaims.permissions.slice().sort()).toEqual([...CORE_PERMISSIONS, 'billing.read'].sort());

    const clerkSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const clerkClaims = accessClaims(clerkSession);
    expect(clerkClaims.roles).toEqual(['clerk']);
    expect(clerkClaims.permissions).toEqual(['orders.read']);
  });

  it('finds the owner role by its slug when the label is not owner', async () => {
    const delegate = createFakeDelegate();
    await delegate.roles.create({ data: { slug: 'owner', label: { en: 'Proprietor' } } });
    app = await createApp(delegate);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const claims = accessClaims(res);
    expect(claims.roles).toEqual(['owner']);
    expect(claims.permissions.slice().sort()).toEqual([...CORE_PERMISSIONS].sort());
    expect(res.body.data.roles).toEqual([{ slug: 'owner', label: { en: 'Proprietor' } }]);
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

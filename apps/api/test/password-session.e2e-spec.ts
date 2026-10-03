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
      async findMany() {
        return users.map((row) => ({ ...row }));
      },
      async create(args) {
        const now = new Date();
        const row: SessionUserRecord = {
          id: randomUUID(),
          name: null,
          email: args.data.email,
          phone: args.data.phone,
          passwordHash: args.data.passwordHash,
          deactivatedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        users.push(row);
        return row;
      },
      async update(args) {
        const row = users.find((entry) => entry.id === args.where.id);
        if (!row) throw new Error(`user ${args.where.id} not found`);
        if (args.data.name !== undefined) row.name = args.data.name;
        if (args.data.email !== undefined) row.email = args.data.email;
        if (args.data.phone !== undefined) row.phone = args.data.phone;
        if (args.data.deactivatedAt !== undefined) row.deactivatedAt = args.data.deactivatedAt;
        row.updatedAt = new Date();
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
      async updateMany(args) {
        let count = 0;
        for (const row of refreshTokens) {
          if (row.userId === args.where.userId && row.revokedAt === null) {
            row.revokedAt = args.data.revokedAt;
            count += 1;
          }
        }
        return { count };
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
      async findMany() {
        return [...roles];
      },
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
        if (typeof args.data.slug === 'string') row.slug = args.data.slug;
        if (args.data.label) row.label = args.data.label;
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
      async deleteMany(args) {
        const kept = userRoles.filter((row) => !matches(row, args.where));
        const count = userRoles.length - kept.length;
        userRoles.splice(0, userRoles.length, ...kept);
        return { count };
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

describe('roles (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('lets an owner create a role with an Arabic and English label and list its permissions', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);

    const created = await request(server)
      .post('/auth/roles')
      .set('Cookie', bearer(registered, ACCESS_TOKEN_COOKIE))
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.read', 'files.read'],
      })
      .expect(201);

    expect(created.body.status).toBe('success');
    expect(created.body.data).toEqual({
      slug: 'clerk',
      label: { ar: 'كاتب', en: 'Clerk' },
      permissions: ['files.read', 'users.read'],
    });

    const list = await request(server)
      .get('/auth/roles')
      .set('Cookie', bearer(registered, ACCESS_TOKEN_COOKIE))
      .expect(200);

    const clerk = (list.body.data as { slug: string }[]).find((role) => role.slug === 'clerk');
    expect(clerk).toEqual({
      slug: 'clerk',
      label: { ar: 'كاتب', en: 'Clerk' },
      permissions: ['files.read', 'users.read'],
    });
  });

  it('lets an owner change a role label and its permissions without changing the slug', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(registered, ACCESS_TOKEN_COOKIE);

    await request(server)
      .post('/auth/roles')
      .set('Cookie', cookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.read', 'files.read'],
      })
      .expect(201);

    const updated = await request(server)
      .patch('/auth/roles/clerk')
      .set('Cookie', cookie)
      .send({
        label: { ar: 'موظف', en: 'Staff' },
        permissions: ['files.read'],
      })
      .expect(200);

    expect(updated.body.data).toEqual({
      slug: 'clerk',
      label: { ar: 'موظف', en: 'Staff' },
      permissions: ['files.read'],
    });

    const list = await request(server).get('/auth/roles').set('Cookie', cookie).expect(200);
    const clerks = (list.body.data as { slug: string }[]).filter((role) => role.slug === 'clerk');
    expect(clerks).toEqual([
      { slug: 'clerk', label: { ar: 'موظف', en: 'Staff' }, permissions: ['files.read'] },
    ]);

    const cleared = await request(server)
      .patch('/auth/roles/clerk')
      .set('Cookie', cookie)
      .send({ label: { ar: 'موظف', en: 'Staff' }, permissions: [] })
      .expect(200);
    expect(cleared.body.data).toEqual({
      slug: 'clerk',
      label: { ar: 'موظف', en: 'Staff' },
      permissions: [],
    });

    const afterClear = await request(server).get('/auth/roles').set('Cookie', cookie).expect(200);
    const clearedClerk = (afterClear.body.data as { slug: string }[]).find((role) => role.slug === 'clerk');
    expect(clearedClerk).toEqual({
      slug: 'clerk',
      label: { ar: 'موظف', en: 'Staff' },
      permissions: [],
    });
  });

  it('keeps a single owner role when its label changes', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(registered, ACCESS_TOKEN_COOKIE);

    const updated = await request(server)
      .patch('/auth/roles/owner')
      .set('Cookie', cookie)
      .send({
        label: { ar: 'المالك', en: 'Proprietor' },
        permissions: CORE_PERMISSIONS,
      })
      .expect(200);

    expect(updated.body.data).toEqual({
      slug: 'owner',
      label: { ar: 'المالك', en: 'Proprietor' },
      permissions: [...CORE_PERMISSIONS].sort(),
    });

    const list = await request(server).get('/auth/roles').set('Cookie', cookie).expect(200);
    const owners = (list.body.data as { slug: string }[]).filter((role) => role.slug === 'owner');
    expect(owners).toEqual([
      {
        slug: 'owner',
        label: { ar: 'المالك', en: 'Proprietor' },
        permissions: [...CORE_PERMISSIONS].sort(),
      },
    ]);
  });

  it('lets an owner assign a role to another user and remove it again', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/roles')
      .set('Cookie', cookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['files.read'],
      })
      .expect(201);

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', cookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const assigned = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(assigned)).toEqual({ roles: ['clerk'], permissions: ['files.read'] });

    await request(server).delete(`/auth/users/${graceId}/roles/clerk`).set('Cookie', cookie).expect(200);

    const removed = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(removed)).toEqual({ roles: [], permissions: [] });
  });

  it('does not offer a way to delete a role', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(registered, ACCESS_TOKEN_COOKIE);

    await request(server)
      .post('/auth/roles')
      .set('Cookie', cookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['files.read'],
      })
      .expect(201);

    await request(server).delete('/auth/roles/clerk').set('Cookie', cookie).expect(404);

    const list = await request(server).get('/auth/roles').set('Cookie', cookie).expect(200);
    const clerk = (list.body.data as { slug: string }[]).find((role) => role.slug === 'clerk');
    expect(clerk).toEqual({
      slug: 'clerk',
      label: { ar: 'كاتب', en: 'Clerk' },
      permissions: ['files.read'],
    });
  });

  it('refuses to remove owner from the only owner', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');

    const refused = await request(server)
      .delete(`/auth/users/${adaId}/roles/owner`)
      .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE))
      .expect(409);
    expect(refused.body.status).toBe('error');

    const again = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(again).roles).toContain('owner');
  });

  it('lets a second owner remove owner from the first', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE))
      .send({ slug: 'owner' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(graceSession).roles).toEqual(['owner']);

    await request(server)
      .delete(`/auth/users/${adaId}/roles/owner`)
      .set('Cookie', bearer(graceSession, ACCESS_TOKEN_COOKIE))
      .expect(200);

    const adaAgain = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(adaAgain).roles).toEqual([]);

    const graceAgain = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(graceAgain).roles).toEqual(['owner']);
  });

  it('keeps one owner when two owners remove each other at the same time', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE))
      .send({ slug: 'owner' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);

    const [removedGrace, removedAda] = await Promise.all([
      request(server)
        .delete(`/auth/users/${graceId}/roles/owner`)
        .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE)),
      request(server)
        .delete(`/auth/users/${adaId}/roles/owner`)
        .set('Cookie', bearer(graceSession, ACCESS_TOKEN_COOKIE)),
    ]);
    expect([removedAda.status, removedGrace.status].sort()).toEqual([200, 409]);

    const afterwards = await Promise.all([
      request(server).post('/auth/login').send({ email: 'ada@example.com', password: 'correct horse' }),
      request(server).post('/auth/login').send({ email: 'grace@example.com', password: 'correct horse' }),
    ]);
    const owners = afterwards.filter((res) => accessClaims(res).roles.includes('owner'));
    expect(owners).toHaveLength(1);
  });

  it('refuses a role change or an assignment when the caller lacks that permission', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['files.read'],
      })
      .expect(201);
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const clerkCookie = bearer(graceSession, ACCESS_TOKEN_COOKIE);

    const update = await request(server)
      .patch('/auth/roles/clerk')
      .set('Cookie', clerkCookie)
      .send({ label: { ar: 'موظف', en: 'Staff' }, permissions: ['files.read'] })
      .expect(403);
    expect(update.body.status).toBe('error');

    const list = await request(server).get('/auth/roles').set('Cookie', ownerCookie).expect(200);
    const clerk = (list.body.data as { slug: string }[]).find((role) => role.slug === 'clerk');
    expect(clerk).toEqual({
      slug: 'clerk',
      label: { ar: 'كاتب', en: 'Clerk' },
      permissions: ['files.read'],
    });

    const assignment = await request(server)
      .post(`/auth/users/${adaId}/roles`)
      .set('Cookie', clerkCookie)
      .send({ slug: 'clerk' })
      .expect(403);
    expect(assignment.body.status).toBe('error');

    const adaAgain = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(adaAgain).roles).toEqual(['owner']);
  });

  it('keeps the grants an owner set on a custom role after another boot', async () => {
    const delegate = createFakeDelegate();
    app = await createApp(delegate, { extraPermissions: ['orders.read'] });
    const server = app.getHttpServer();
    const registered = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const cookie = bearer(registered, ACCESS_TOKEN_COOKIE);

    await request(server)
      .post('/auth/roles')
      .set('Cookie', cookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['files.read'],
      })
      .expect(201);

    await app.close();
    app = await createApp(delegate, { extraPermissions: ['billing.read'] });
    const rebooted = app.getHttpServer();

    const owner = await request(rebooted)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(owner).roles).toEqual(['owner']);
    expect(accessClaims(owner).permissions.slice().sort()).toEqual(
      [...CORE_PERMISSIONS, 'billing.read'].sort(),
    );

    const list = await request(rebooted)
      .get('/auth/roles')
      .set('Cookie', bearer(owner, ACCESS_TOKEN_COOKIE))
      .expect(200);
    const roles = list.body.data as { slug: string; label: Record<string, string>; permissions: string[] }[];
    expect(roles.find((role) => role.slug === 'clerk')).toEqual({
      slug: 'clerk',
      label: { ar: 'كاتب', en: 'Clerk' },
      permissions: ['files.read'],
    });
    expect(roles.find((role) => role.slug === 'owner')?.permissions).toEqual(
      [...CORE_PERMISSIONS, 'billing.read'].sort(),
    );
  });
});

describe('users (e2e)', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('lets a user with users.read list users and refuses a signed-in user without it', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    const noor = await request(server)
      .post('/auth/register')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(201);
    const noorId = noor.body.data.id;
    if (typeof noorId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.read'],
      })
      .expect(201);
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);

    const list = await request(server)
      .get('/auth/users')
      .set('Cookie', bearer(graceSession, ACCESS_TOKEN_COOKIE))
      .expect(200);
    expect(list.body.status).toBe('success');

    const byEmail = new Map(
      (list.body.data as { email: string }[]).map((user) => [user.email, user]),
    );
    expect(byEmail.get('ada@example.com')).toEqual({
      id: adaId,
      name: null,
      email: 'ada@example.com',
      phone: null,
      deactivatedAt: null,
    });
    expect(byEmail.get('grace@example.com')).toEqual({
      id: graceId,
      name: null,
      email: 'grace@example.com',
      phone: null,
      deactivatedAt: null,
    });
    expect(byEmail.get('noor@example.com')).toEqual({
      id: noorId,
      name: null,
      email: 'noor@example.com',
      phone: null,
      deactivatedAt: null,
    });
    expect(JSON.stringify(list.body)).not.toContain('passwordHash');

    const noorSession = await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(200);
    const refused = await request(server)
      .get('/auth/users')
      .set('Cookie', bearer(noorSession, ACCESS_TOKEN_COOKIE))
      .expect(403);
    expect(refused.body.status).toBe('error');
  });

  it('lets a user with users.update change a name, email, and phone', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/register')
      .send({ email: 'noor@example.com', phone: '+15551219999', password: 'correct horse' })
      .expect(201);

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.update'],
      })
      .expect(201);
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const clerkCookie = bearer(graceSession, ACCESS_TOKEN_COOKIE);

    const updated = await request(server)
      .patch(`/auth/users/${adaId}`)
      .set('Cookie', clerkCookie)
      .send({
        name: 'Ada Lovelace',
        email: 'Ada.Lovelace@example.com',
        phone: '+15551212000',
      })
      .expect(200);
    expect(updated.body.data).toEqual({
      id: adaId,
      name: 'Ada Lovelace',
      email: 'ada.lovelace@example.com',
      phone: '+15551212000',
      deactivatedAt: null,
    });

    const list = await request(server).get('/auth/users').set('Cookie', ownerCookie).expect(200);
    const adaRow = (list.body.data as { id: string }[]).find((user) => user.id === adaId);
    expect(adaRow).toEqual({
      id: adaId,
      name: 'Ada Lovelace',
      email: 'ada.lovelace@example.com',
      phone: '+15551212000',
      deactivatedAt: null,
    });

    const duplicateEmail = await request(server)
      .patch(`/auth/users/${adaId}`)
      .set('Cookie', clerkCookie)
      .send({ name: 'Ada Lovelace', email: 'grace@example.com', phone: '+15551212000' })
      .expect(409);
    expect(duplicateEmail.body.status).toBe('error');

    const duplicatePhone = await request(server)
      .patch(`/auth/users/${adaId}`)
      .set('Cookie', clerkCookie)
      .send({ name: 'Ada Lovelace', email: 'ada.lovelace@example.com', phone: '+15551219999' })
      .expect(409);
    expect(duplicatePhone.body.status).toBe('error');

    const noorSession = await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(200);
    const refused = await request(server)
      .patch(`/auth/users/${adaId}`)
      .set('Cookie', bearer(noorSession, ACCESS_TOKEN_COOKIE))
      .send({ name: 'Changed', email: 'ada.lovelace@example.com', phone: '+15551212000' })
      .expect(403);
    expect(refused.body.status).toBe('error');

    const afterRefusal = await request(server).get('/auth/users').set('Cookie', ownerCookie).expect(200);
    const stillAda = (afterRefusal.body.data as { id: string }[]).find((user) => user.id === adaId);
    expect(stillAda).toEqual({
      id: adaId,
      name: 'Ada Lovelace',
      email: 'ada.lovelace@example.com',
      phone: '+15551212000',
      deactivatedAt: null,
    });
  });

  it('lets a user with users.deactivate deactivate and restore someone who is not the last owner', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    const noor = await request(server)
      .post('/auth/register')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(201);
    const noorId = noor.body.data.id;
    if (typeof noorId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.deactivate'],
      })
      .expect(201);
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const clerkCookie = bearer(graceSession, ACCESS_TOKEN_COOKIE);

    const noorSession = await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(200);
    const refused = await request(server)
      .post(`/auth/users/${graceId}/deactivate`)
      .set('Cookie', bearer(noorSession, ACCESS_TOKEN_COOKIE))
      .expect(403);
    expect(refused.body.status).toBe('error');

    const deactivated = await request(server)
      .post(`/auth/users/${noorId}/deactivate`)
      .set('Cookie', clerkCookie)
      .expect(200);
    expect(deactivated.body.status).toBe('success');
    const deactivatedAt = deactivated.body.data.deactivatedAt;
    expect(typeof deactivatedAt).toBe('string');
    expect(Date.parse(deactivatedAt)).not.toBeNaN();
    expect(deactivated.body.data).toEqual({
      id: noorId,
      name: null,
      email: 'noor@example.com',
      phone: null,
      deactivatedAt,
    });
    expect(JSON.stringify(deactivated.body)).not.toContain('passwordHash');

    const blocked = await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(401);
    expect(blocked.body.status).toBe('error');

    const listed = await request(server).get('/auth/users').set('Cookie', ownerCookie).expect(200);
    const noorRow = (listed.body.data as { id: string }[]).find((user) => user.id === noorId);
    expect(noorRow).toEqual({
      id: noorId,
      name: null,
      email: 'noor@example.com',
      phone: null,
      deactivatedAt,
    });

    const restored = await request(server)
      .post(`/auth/users/${noorId}/restore`)
      .set('Cookie', clerkCookie)
      .expect(200);
    expect(restored.body.data).toEqual({
      id: noorId,
      name: null,
      email: 'noor@example.com',
      phone: null,
      deactivatedAt: null,
    });

    await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(200);

    const afterRestore = await request(server).get('/auth/users').set('Cookie', ownerCookie).expect(200);
    const restoredRow = (afterRestore.body.data as { id: string }[]).find((user) => user.id === noorId);
    expect(restoredRow).toEqual({
      id: noorId,
      name: null,
      email: 'noor@example.com',
      phone: null,
      deactivatedAt: null,
    });
  });

  it('refuses to deactivate the last active owner, who can still sign in', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.deactivate'],
      })
      .expect(201);
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);

    const refused = await request(server)
      .post(`/auth/users/${adaId}/deactivate`)
      .set('Cookie', bearer(graceSession, ACCESS_TOKEN_COOKIE))
      .expect(409);
    expect(refused.body.status).toBe('error');
    expect(refused.body.message).toBe('The last owner cannot be deactivated');

    await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);

    const listed = await request(server).get('/auth/users').set('Cookie', ownerCookie).expect(200);
    const adaRow = (listed.body.data as { id: string }[]).find((user) => user.id === adaId);
    expect(adaRow).toMatchObject({ id: adaId, deactivatedAt: null });
  });

  it('lets a second owner deactivate the first, who can no longer sign in or refresh', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', bearer(ada, ACCESS_TOKEN_COOKIE))
      .send({ slug: 'owner' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(graceSession).roles).toEqual(['owner']);

    await request(server)
      .post(`/auth/users/${adaId}/deactivate`)
      .set('Cookie', bearer(graceSession, ACCESS_TOKEN_COOKIE))
      .expect(200);

    const blocked = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(401);
    expect(blocked.body.status).toBe('error');

    const refreshed = await request(server)
      .post('/auth/refresh')
      .set('Cookie', bearer(ada, REFRESH_TOKEN_COOKIE))
      .expect(401);
    expect(refreshed.body.status).toBe('error');
  });

  it('refuses a deactivated user\'s refresh token, including after they are restored', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    const noor = await request(server)
      .post('/auth/register')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(201);
    const noorId = noor.body.data.id;
    if (typeof noorId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post('/auth/roles')
      .set('Cookie', ownerCookie)
      .send({
        slug: 'clerk',
        label: { ar: 'كاتب', en: 'Clerk' },
        permissions: ['users.deactivate'],
      })
      .expect(201);
    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'clerk' })
      .expect(201);

    const graceSession = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(200);
    const clerkCookie = bearer(graceSession, ACCESS_TOKEN_COOKIE);

    const noorSession = await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(200);
    const oldRefresh = bearer(noorSession, REFRESH_TOKEN_COOKIE);

    await request(server).post(`/auth/users/${noorId}/deactivate`).set('Cookie', clerkCookie).expect(200);

    const whileDeactivated = await request(server)
      .post('/auth/refresh')
      .set('Cookie', oldRefresh)
      .expect(401);
    expect(whileDeactivated.body.status).toBe('error');

    await request(server).post(`/auth/users/${noorId}/restore`).set('Cookie', clerkCookie).expect(200);

    const afterRestore = await request(server).post('/auth/refresh').set('Cookie', oldRefresh).expect(401);
    expect(afterRestore.body.status).toBe('error');

    await request(server)
      .post('/auth/login')
      .send({ email: 'noor@example.com', password: 'correct horse' })
      .expect(200);
  });

  it('does not create a user except through registration', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const created = await request(server)
      .post('/auth/users')
      .set('Cookie', ownerCookie)
      .send({ email: 'new@example.com', password: 'correct horse', name: 'New User' })
      .expect(404);
    expect(created.body.status).toBe('error');

    const listed = await request(server).get('/auth/users').set('Cookie', ownerCookie).expect(200);
    expect(listed.body.data).toEqual([
      {
        id: ada.body.data.id,
        name: null,
        email: 'ada@example.com',
        phone: null,
        deactivatedAt: null,
      },
    ]);
  });

  it('refuses to remove owner from the last active owner while a deactivated owner still holds it', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const adaId = ada.body.data.id;
    if (typeof adaId !== 'string') throw new Error('registered user is missing an id');
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'owner' })
      .expect(201);

    await request(server).post(`/auth/users/${graceId}/deactivate`).set('Cookie', ownerCookie).expect(200);

    const refused = await request(server)
      .delete(`/auth/users/${adaId}/roles/owner`)
      .set('Cookie', ownerCookie)
      .expect(409);
    expect(refused.body.status).toBe('error');
    expect(refused.body.message).toBe('The last owner cannot lose the owner role');

    const adaAgain = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(adaAgain).roles).toEqual(['owner']);
  });

  it('lets a deactivated owner lose the owner role while another owner is still active', async () => {
    app = await createApp();
    const server = app.getHttpServer();
    const ada = await request(server)
      .post('/auth/register')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(201);
    const ownerCookie = bearer(ada, ACCESS_TOKEN_COOKIE);

    const grace = await request(server)
      .post('/auth/register')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(201);
    const graceId = grace.body.data.id;
    if (typeof graceId !== 'string') throw new Error('registered user is missing an id');

    await request(server)
      .post(`/auth/users/${graceId}/roles`)
      .set('Cookie', ownerCookie)
      .send({ slug: 'owner' })
      .expect(201);

    await request(server).post(`/auth/users/${graceId}/deactivate`).set('Cookie', ownerCookie).expect(200);
    await request(server).post(`/auth/users/${graceId}/deactivate`).set('Cookie', ownerCookie).expect(200);

    await request(server)
      .delete(`/auth/users/${graceId}/roles/owner`)
      .set('Cookie', ownerCookie)
      .expect(200);

    const adaAgain = await request(server)
      .post('/auth/login')
      .send({ email: 'ada@example.com', password: 'correct horse' })
      .expect(200);
    expect(accessClaims(adaAgain).roles).toEqual(['owner']);

    const graceAgain = await request(server)
      .post('/auth/login')
      .send({ email: 'grace@example.com', password: 'correct horse' })
      .expect(401);
    expect(graceAgain.body.status).toBe('error');
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

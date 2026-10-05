import { Test } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { type Response } from 'supertest';
import { ApiExceptionFilter, validationExceptionFactory } from '@core/backend-core';
import { configureHttp } from '../src/bootstrap/configure-http.js';
import { ACCESS_TOKEN_COOKIE } from '@core/auth';
import {
  AuthModule,
  type GoogleSignIn,
  type OtpSignIn,
  type PermissionRecord,
  type RolePermissionRecord,
  type RoleRecord,
  type SessionDelegate,
  type SessionRefreshRecord,
  type SessionUserRecord,
  type UserRoleRecord,
} from '@core/auth/nest';
import type { FileDelegate, FileRecord, StorageDriver } from '@core/files';
import { FilesModule } from '@core/files/nest';
import { demoUserMiddleware } from '../src/common/middleware/demo-user.middleware.js';

/**
 * In-memory stand-in for the Prisma accessors the app passes into auth.
 * It answers the delegate calls. Tests observe sessions only through HTTP.
 */
export function createFakeDelegate(): SessionDelegate {
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
          googleSubject: args.data.googleSubject,
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
        if (
          userRoles.some(
            (row) => row.userId === args.data.userId && row.roleId === args.data.roleId,
          )
        ) {
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

export function cookieValue(res: Response, name: string): string | undefined {
  const line = setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
  if (!line) return undefined;
  const value = line.slice(name.length + 1).split(';')[0];
  return value === '' ? undefined : value;
}

export function cookieHas(res: Response, name: string, attribute: RegExp): boolean {
  const line = setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
  return line ? attribute.test(line) : false;
}

export function cookieCleared(res: Response, name: string): boolean {
  const line = setCookies(res).find((cookie) => cookie.startsWith(`${name}=`));
  if (!line) return false;
  return new RegExp(`^${name}=;`).test(line);
}

export function bearer(res: Response, name: string): string {
  const value = cookieValue(res, name);
  if (!value) throw new Error(`missing ${name} cookie`);
  return `${name}=${value}`;
}

export function accessClaims(res: Response): { roles: string[]; permissions: string[] } {
  const token = cookieValue(res, ACCESS_TOKEN_COOKIE);
  if (!token) throw new Error('missing access token');
  const body = token.split('.')[1];
  if (!body) throw new Error('missing access token payload');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
    roles?: unknown;
    permissions?: unknown;
  };
  return {
    roles: Array.isArray(payload.roles)
      ? payload.roles.filter((role) => typeof role === 'string')
      : [],
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission) => typeof permission === 'string')
      : [],
  };
}

/** In-memory stand-in for `prisma.file`. Tests observe files only through HTTP. */
export function createFakeFiles(): FileDelegate {
  const files: FileRecord[] = [];
  return {
    async create(args) {
      const row: FileRecord = {
        id: randomUUID(),
        name: args.data.name,
        mediaType: args.data.mediaType,
        size: args.data.size,
        path: args.data.path,
        url: args.data.url,
        uploadedById: args.data.uploadedById,
        createdAt: new Date(),
      };
      files.push(row);
      return row;
    },
    async findFirst(args) {
      return files.find((row) => row.id === args.where.id) ?? null;
    },
    async delete(args) {
      const index = files.findIndex((row) => row.id === args.where.id);
      const row = index >= 0 ? files.splice(index, 1)[0] : undefined;
      if (!row) throw new Error(`file ${args.where.id} not found`);
      return row;
    },
  };
}

export async function createApp(
  delegate: SessionDelegate = createFakeDelegate(),
  options?: {
    loginRateLimit?: number;
    extraPermissions?: string[];
    otp?: OtpSignIn;
    google?: GoogleSignIn;
    files?: {
      storage: StorageDriver;
      maxBytes: number;
      allowedTypes: readonly string[];
      records?: FileDelegate;
    };
  },
): Promise<INestApplication> {
  const imports = [
    AuthModule.forRoot({
      users: delegate.users,
      refreshTokens: delegate.refreshTokens,
      permissions: delegate.permissions,
      roles: delegate.roles,
      rolePermissions: delegate.rolePermissions,
      userRoles: delegate.userRoles,
      transaction: (run) => delegate.transaction(run),
      extraPermissions: options?.extraPermissions,
      otp: options?.otp,
      google: options?.google,
      accessSecret: 'test-access-secret',
      refreshSecret: 'test-refresh-secret',
      accessTtl: '15m',
      refreshTtl: '7d',
    }),
  ];
  if (options?.files) {
    imports.push(
      FilesModule.forRoot({
        files: options.files.records ?? createFakeFiles(),
        storage: options.files.storage,
        maxBytes: options.files.maxBytes,
        allowedTypes: options.files.allowedTypes,
      }),
    );
  }
  const mod = await Test.createTestingModule({
    imports,
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

import { CORE_PERMISSION_KEYS, OWNER_ROLE_LABEL, OWNER_ROLE_SLUG } from './catalog.js';
import { durationToMs, hashRefreshToken, newRefreshToken, signAccessToken, verifyAccessToken } from './tokens.js';
import { hashPassword, verifyPassword } from './password.js';
import type {
  IssuedSession,
  PublicRole,
  PublicUser,
  SessionRefreshRecord,
  SessionStores,
  SessionUserRecord,
  UserWhere,
} from './types.js';

export interface SessionServiceOptions extends SessionStores {
  transaction<T>(run: (stores: SessionStores) => Promise<T>): Promise<T>;
  /** Product keys appended to the core catalog. Core keys are always included. */
  extraPermissions?: readonly string[];
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface Credentials {
  email?: string;
  phone?: string;
  password: string;
}

/** Raised by session use-cases. The Nest adapter turns it into an HTTP error. */
export class SessionError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SessionError';
    this.status = status;
  }
}

/**
 * Password registration and sessions.
 * Query shape lives here. The app supplies Prisma accessors and does not reimplement them.
 */
export class SessionService {
  private readonly accessTtlMs: number;
  private readonly refreshTtlMs: number;

  constructor(private readonly options: SessionServiceOptions) {
    if (!options.accessSecret || !options.refreshSecret) {
      throw new Error('JWT access and refresh secrets are required');
    }
    this.accessTtlMs = durationToMs(options.accessTtl);
    this.refreshTtlMs = durationToMs(options.refreshTtl);
  }

  /**
   * Upsert the core permission catalog, ensure the owner role exists, and
   * rewrite that role's grants to the catalog. An existing owner label is kept.
   */
  async syncCatalog(): Promise<void> {
    const keys = this.catalogKeys();
    for (const key of keys) {
      await this.options.permissions.upsert({
        where: { key },
        create: { key },
        update: {},
      });
    }

    let owner = await this.options.roles.findFirst({ where: { slug: OWNER_ROLE_SLUG } });
    if (!owner) {
      owner = await this.options.roles.create({
        data: { slug: OWNER_ROLE_SLUG, label: OWNER_ROLE_LABEL },
      });
    }

    const catalogKeys = new Set(keys);
    const catalog = await this.options.permissions.findMany();
    const wanted = catalog.filter((permission) => catalogKeys.has(permission.key));
    const wantedIds = wanted.map((permission) => permission.id);
    const grants = await this.options.rolePermissions.findMany({ where: { roleId: owner.id } });
    if (wantedIds.length > 0) {
      await this.options.rolePermissions.deleteMany({
        where: { roleId: owner.id, permissionId: { notIn: wantedIds } },
      });
    }
    const granted = new Set(grants.map((grant) => grant.permissionId));
    for (const permission of wanted) {
      if (granted.has(permission.id)) continue;
      await this.options.rolePermissions.create({
        data: { roleId: owner.id, permissionId: permission.id },
      });
    }
  }

  async register(input: Credentials): Promise<IssuedSession> {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if (!email && !phone) {
      throw new SessionError('Email or phone is required', 400);
    }

    const existing = await this.options.users.findFirst({ where: identifierWhere(email, phone) });
    if (existing) {
      throw new SessionError('An account with that email or phone already exists', 409);
    }

    const user = await this.options.users.create({
      data: { email, phone, passwordHash: await hashPassword(input.password) },
    });
    await this.claimOwnerIfFirst(user.id);
    return this.issue(user);
  }

  async login(input: Credentials): Promise<IssuedSession> {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    if ((!email && !phone) || !input.password) {
      throw new SessionError('Invalid email, phone, or password', 401);
    }

    const user = await this.options.users.findFirst({ where: email ? { email } : { phone } });
    if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new SessionError('Invalid email, phone, or password', 401);
    }
    if (user.deactivatedAt) {
      throw new SessionError('Invalid email, phone, or password', 401);
    }
    return this.issue(user);
  }

  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    const record = await this.findLiveRefresh(rawToken);
    const user = await this.options.users.findFirst({ where: { id: record.userId } });
    if (!user || user.deactivatedAt) throw new SessionError('Refresh token is invalid', 401);
    await this.options.refreshTokens.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issue(user);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const record = await this.options.refreshTokens.findFirst({
      where: { tokenHash: hashRefreshToken(rawToken, this.options.refreshSecret) },
    });
    if (!record || record.revokedAt) return;
    await this.options.refreshTokens.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
  }

  async profile(userId: string): Promise<PublicUser> {
    const user = await this.options.users.findFirst({ where: { id: userId } });
    if (!user) throw new SessionError('Unauthorized', 401);
    return this.describe(user);
  }

  verifyAccess(token: string) {
    return verifyAccessToken(token, this.options.accessSecret);
  }

  private async issue(user: SessionUserRecord): Promise<IssuedSession> {
    const refreshToken = newRefreshToken();
    await this.options.refreshTokens.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken, this.options.refreshSecret),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });
    const access = await this.accessClaims(user.id);
    return {
      user: await this.describe(user),
      accessToken: signAccessToken(user.id, this.options.accessSecret, this.accessTtlMs, 'public', access),
      refreshToken,
      accessMaxAgeMs: this.accessTtlMs,
      refreshMaxAgeMs: this.refreshTtlMs,
    };
  }

  /**
   * The first account to register receives owner. Later accounts stay unassigned.
   * Updating the owner slug locks that row for the transaction, so two racing
   * registrations cannot both observe zero holders.
   */
  private async claimOwnerIfFirst(userId: string): Promise<void> {
    await this.options.transaction(async (tx) => {
      const owner = await tx.roles.findFirst({ where: { slug: OWNER_ROLE_SLUG } });
      if (!owner) {
        throw new Error('Owner role is missing. Boot must sync the catalog before registration.');
      }
      await tx.roles.update({ where: { id: owner.id }, data: { slug: owner.slug } });
      const holders = await tx.userRoles.count({ where: { roleId: owner.id } });
      if (holders > 0) return;
      await tx.userRoles.create({ data: { userId, roleId: owner.id } });
    });
  }

  private async accessClaims(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
    const memberships = await this.options.userRoles.findMany({ where: { userId } });
    const roles: string[] = [];
    const permissionIds = new Set<string>();
    for (const membership of memberships) {
      const role = await this.options.roles.findFirst({ where: { id: membership.roleId } });
      if (!role) continue;
      roles.push(role.slug);
      const grants = await this.options.rolePermissions.findMany({ where: { roleId: role.id } });
      for (const grant of grants) permissionIds.add(grant.permissionId);
    }
    const catalog = await this.options.permissions.findMany();
    const permissions = [
      ...new Set(
        catalog.filter((permission) => permissionIds.has(permission.id)).map((permission) => permission.key),
      ),
    ];
    return { roles, permissions };
  }

  private async describe(user: SessionUserRecord): Promise<PublicUser> {
    const memberships = await this.options.userRoles.findMany({ where: { userId: user.id } });
    const roles: PublicRole[] = [];
    for (const membership of memberships) {
      const role = await this.options.roles.findFirst({ where: { id: membership.roleId } });
      if (!role) continue;
      roles.push({ slug: role.slug, label: roleLabel(role.label) });
    }
    return { id: user.id, email: user.email, phone: user.phone, roles };
  }

  private catalogKeys(): string[] {
    return [...new Set<string>([...CORE_PERMISSION_KEYS, ...(this.options.extraPermissions ?? [])])];
  }

  private async findLiveRefresh(rawToken: string | undefined): Promise<SessionRefreshRecord> {
    if (!rawToken) throw new SessionError('Refresh token is invalid', 401);
    const record = await this.options.refreshTokens.findFirst({
      where: { tokenHash: hashRefreshToken(rawToken, this.options.refreshSecret) },
    });
    if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new SessionError('Refresh token is invalid', 401);
    }
    return record;
  }
}

export function roleLabel(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const label: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') label[key] = entry;
  }
  return label;
}

export function normalizeEmail(value: string | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

export function normalizePhone(value: string | undefined): string | null {
  if (!value) return null;
  const phone = value.trim();
  return phone.length > 0 ? phone : null;
}

function identifierWhere(email: string | null, phone: string | null): UserWhere {
  const or: UserWhere[] = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  return { OR: or };
}

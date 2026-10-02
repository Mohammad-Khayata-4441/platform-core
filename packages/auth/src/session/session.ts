import { durationToMs, hashRefreshToken, newRefreshToken, signAccessToken, verifyAccessToken } from './tokens.js';
import { hashPassword, verifyPassword } from './password.js';
import type {
  IssuedSession,
  PublicUser,
  RefreshTokenDelegate,
  SessionRefreshRecord,
  SessionUserRecord,
  UserDelegate,
  UserWhere,
} from './types.js';

export interface SessionServiceOptions {
  users: UserDelegate;
  refreshTokens: RefreshTokenDelegate;
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
    return this.issue(user);
  }

  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    const record = await this.findLiveRefresh(rawToken);
    await this.options.refreshTokens.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.options.users.findFirst({ where: { id: record.userId } });
    if (!user) throw new SessionError('Refresh token is invalid', 401);
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
    return toPublic(user);
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
    return {
      user: toPublic(user),
      accessToken: signAccessToken(user.id, this.options.accessSecret, this.accessTtlMs),
      refreshToken,
      accessMaxAgeMs: this.accessTtlMs,
      refreshMaxAgeMs: this.refreshTtlMs,
    };
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

function toPublic(user: SessionUserRecord): PublicUser {
  return { id: user.id, email: user.email, phone: user.phone };
}

function normalizeEmail(value: string | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

function normalizePhone(value: string | undefined): string | null {
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

/** A person who can sign in. The delegate returns this row. */
export interface SessionUserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Stored refresh session. The cookie carries the raw token; the row stores its hash. */
export interface SessionRefreshRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface UserWhere {
  id?: string;
  email?: string | null;
  phone?: string | null;
  OR?: UserWhere[];
}

/** Structural slice of `prisma.user`. This package does not import Prisma. */
export interface UserDelegate {
  findFirst(args: { where: UserWhere }): Promise<SessionUserRecord | null>;
  create(args: {
    data: { email: string | null; phone: string | null; passwordHash: string };
  }): Promise<SessionUserRecord>;
}

/** Structural slice of `prisma.refreshToken`. */
export interface RefreshTokenDelegate {
  findFirst(args: { where: { tokenHash: string } }): Promise<SessionRefreshRecord | null>;
  create(args: {
    data: { userId: string; tokenHash: string; expiresAt: Date };
  }): Promise<SessionRefreshRecord>;
  update(args: {
    where: { id: string };
    data: { revokedAt: Date };
  }): Promise<SessionRefreshRecord>;
}

export interface SessionDelegate {
  users: UserDelegate;
  refreshTokens: RefreshTokenDelegate;
}

/** What register, login, and profile return. The password hash stays in the delegate. */
export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
}

export interface IssuedSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

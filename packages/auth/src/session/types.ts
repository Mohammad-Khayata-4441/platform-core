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

export interface PermissionRecord {
  id: string;
  key: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Label is the JSON column. Typed wide so this package does not import Prisma. */
export interface RoleRecord {
  id: string;
  slug: string;
  label: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermissionRecord {
  roleId: string;
  permissionId: string;
}

export interface UserRoleRecord {
  userId: string;
  roleId: string;
}

/** Structural slice of `prisma.permission`. */
export interface PermissionDelegate {
  findMany(): Promise<PermissionRecord[]>;
  upsert(args: {
    where: { key: string };
    create: { key: string };
    update: Record<string, never>;
  }): Promise<PermissionRecord>;
}

/** Structural slice of `prisma.role`. `update` of the same slug locks the row. */
export interface RoleDelegate {
  findFirst(args: { where: { id?: string; slug?: string } }): Promise<RoleRecord | null>;
  create(args: { data: { slug: string; label: { en: string } } }): Promise<RoleRecord>;
  update(args: { where: { id: string }; data: { slug: string } }): Promise<RoleRecord>;
}

/** Structural slice of `prisma.rolePermission`. */
export interface RolePermissionDelegate {
  findMany(args: { where: { roleId: string } }): Promise<RolePermissionRecord[]>;
  create(args: { data: { roleId: string; permissionId: string } }): Promise<RolePermissionRecord>;
  deleteMany(args: {
    where: { roleId: string; permissionId: { notIn: string[] } };
  }): Promise<{ count: number }>;
}

/** Structural slice of `prisma.userRole`. */
export interface UserRoleDelegate {
  findMany(args: { where: { userId?: string; roleId?: string } }): Promise<UserRoleRecord[]>;
  count(args: { where: { roleId: string } }): Promise<number>;
  create(args: { data: { userId: string; roleId: string } }): Promise<UserRoleRecord>;
}

/** Accessors a session use-case may call. Inside a transaction these are the tx client. */
export interface SessionStores {
  users: UserDelegate;
  refreshTokens: RefreshTokenDelegate;
  permissions: PermissionDelegate;
  roles: RoleDelegate;
  rolePermissions: RolePermissionDelegate;
  userRoles: UserRoleDelegate;
}

export interface SessionDelegate extends SessionStores {
  transaction<T>(run: (stores: SessionStores) => Promise<T>): Promise<T>;
}

/** What register, login, and profile return. The password hash stays in the delegate. */
export interface PublicRole {
  slug: string;
  label: Record<string, string>;
}

export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  roles: PublicRole[];
}

export interface IssuedSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

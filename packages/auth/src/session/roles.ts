import { OWNER_ROLE_SLUG } from './catalog.js';
import { roleLabel, SessionError } from './session.js';
import type { RoleRecord, SessionDelegate } from './types.js';

export interface RoleView {
  slug: string;
  label: Record<string, string>;
  permissions: string[];
}

export interface RoleDraft {
  slug: string;
  label: { ar: string; en: string };
  permissions: string[];
}

/** Label and grants for an existing role. The slug is the lookup key and is not rewritten. */
export interface RoleChange {
  label: { ar: string; en: string };
  permissions: string[];
}

export interface RoleAssignment {
  userId: string;
  slug: string;
}

/** Create, update, list, and assign roles. The app supplies the same Prisma accessors as sessions. */
export class RoleService {
  constructor(private readonly options: SessionDelegate) {}

  async create(callerPermissions: readonly string[], draft: RoleDraft): Promise<RoleView> {
    this.assertCan(callerPermissions, 'roles.create');
    const slug = draft.slug.trim();
    const existing = await this.options.roles.findFirst({ where: { slug } });
    if (existing) throw new SessionError('A role with that slug already exists', 409);

    const keys = [...new Set(draft.permissions)];
    const permissionIds = await this.permissionIds(keys);
    const role = await this.options.roles.create({
      data: { slug, label: { ar: draft.label.ar, en: draft.label.en } },
    });
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) throw new SessionError(`Unknown permission "${key}"`, 400);
      await this.options.rolePermissions.create({
        data: { roleId: role.id, permissionId },
      });
    }
    return this.toView(role, keys);
  }

  async update(
    callerPermissions: readonly string[],
    slug: string,
    change: RoleChange,
  ): Promise<RoleView> {
    this.assertCan(callerPermissions, 'roles.update');
    const role = await this.options.roles.findFirst({ where: { slug } });
    if (!role) throw new SessionError('Role not found', 404);

    const keys = [...new Set(change.permissions)];
    const permissionIds = await this.permissionIds(keys);
    const updated = await this.options.roles.update({
      where: { id: role.id },
      data: {
        slug: role.slug,
        label: { ar: change.label.ar, en: change.label.en },
      },
    });
    await this.replaceGrants(role.id, keys, permissionIds);
    return this.toView(updated, keys);
  }

  async assign(
    callerPermissions: readonly string[],
    userId: string,
    slug: string,
  ): Promise<RoleAssignment> {
    this.assertCan(callerPermissions, 'roles.assign');
    const role = await this.requireRole(slug);
    const user = await this.options.users.findFirst({ where: { id: userId } });
    if (!user) throw new SessionError('User not found', 404);
    const held = await this.options.userRoles.findMany({ where: { userId, roleId: role.id } });
    if (held.length === 0) {
      await this.options.userRoles.create({ data: { userId, roleId: role.id } });
    }
    return { userId, slug: role.slug };
  }

  async remove(
    callerPermissions: readonly string[],
    userId: string,
    slug: string,
  ): Promise<RoleAssignment> {
    this.assertCan(callerPermissions, 'roles.assign');
    const role = await this.requireRole(slug);
    if (role.slug === OWNER_ROLE_SLUG) {
      await this.options.transaction(async (tx) => {
        await tx.roles.update({ where: { id: role.id }, data: { slug: role.slug } });
        const holders = await tx.userRoles.count({ where: { roleId: role.id } });
        const held = await tx.userRoles.findMany({ where: { userId, roleId: role.id } });
        if (held.length > 0 && holders <= 1) {
          throw new SessionError('The last owner cannot lose the owner role', 409);
        }
        await tx.userRoles.deleteMany({ where: { userId, roleId: role.id } });
      });
      return { userId, slug: role.slug };
    }
    await this.options.userRoles.deleteMany({ where: { userId, roleId: role.id } });
    return { userId, slug: role.slug };
  }

  async list(callerPermissions: readonly string[]): Promise<RoleView[]> {
    this.assertCan(callerPermissions, 'roles.read');
    const roles = await this.options.roles.findMany();
    const catalog = await this.options.permissions.findMany();
    const keyById = new Map(catalog.map((permission) => [permission.id, permission.key]));
    const views: RoleView[] = [];
    for (const role of roles) {
      const grants = await this.options.rolePermissions.findMany({ where: { roleId: role.id } });
      const permissions = grants
        .map((grant) => keyById.get(grant.permissionId))
        .filter((key): key is string => typeof key === 'string')
        .sort();
      views.push(this.toView(role, permissions));
    }
    return views;
  }

  /** Drop grants outside `keys`, then add the ones that are missing. An empty `notIn` is invalid SQL. */
  private async replaceGrants(
    roleId: string,
    keys: readonly string[],
    permissionIds: ReadonlyMap<string, string>,
  ): Promise<void> {
    const wantedIds: string[] = [];
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) throw new SessionError(`Unknown permission "${key}"`, 400);
      wantedIds.push(permissionId);
    }
    const grants = await this.options.rolePermissions.findMany({ where: { roleId } });
    if (wantedIds.length > 0) {
      await this.options.rolePermissions.deleteMany({
        where: { roleId, permissionId: { notIn: wantedIds } },
      });
    } else {
      await this.options.rolePermissions.deleteMany({ where: { roleId } });
    }
    const granted = new Set(grants.map((grant) => grant.permissionId));
    for (const permissionId of wantedIds) {
      if (granted.has(permissionId)) continue;
      await this.options.rolePermissions.create({ data: { roleId, permissionId } });
    }
  }

  private async requireRole(slug: string): Promise<RoleRecord> {
    const role = await this.options.roles.findFirst({ where: { slug } });
    if (!role) throw new SessionError('Role not found', 404);
    return role;
  }

  private async permissionIds(keys: readonly string[]): Promise<Map<string, string>> {
    const catalog = await this.options.permissions.findMany();
    const ids = new Map(catalog.map((permission) => [permission.key, permission.id]));
    for (const key of keys) {
      if (!ids.has(key)) throw new SessionError(`Unknown permission "${key}"`, 400);
    }
    return ids;
  }

  private toView(role: RoleRecord, permissions: readonly string[]): RoleView {
    return { slug: role.slug, label: roleLabel(role.label), permissions: [...permissions].sort() };
  }

  private assertCan(permissions: readonly string[], key: string): void {
    if (!permissions.includes(key)) throw new SessionError('You do not have permission to do that', 403);
  }
}

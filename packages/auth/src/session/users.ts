import { OWNER_ROLE_SLUG } from './catalog.js';
import { isLastActiveHolder } from './roles.js';
import { normalizeEmail, normalizePhone, SessionError } from './session.js';
import type { SessionDelegate, SessionStores, SessionUserRecord } from './types.js';

export interface UserView {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  deactivatedAt: string | null;
}

/** Name plus the contact details a permitted user may correct. */
export interface UserChange {
  name: string;
  email?: string;
  phone?: string;
}

/** List, correct, and deactivate users. The app supplies the same Prisma accessors as sessions. */
export class UserService {
  constructor(private readonly options: SessionDelegate) {}

  async list(callerPermissions: readonly string[]): Promise<UserView[]> {
    this.assertCan(callerPermissions, 'users.read');
    const users = await this.options.users.findMany();
    return users.map((user) => this.view(user));
  }

  async update(
    callerPermissions: readonly string[],
    userId: string,
    change: UserChange,
  ): Promise<UserView> {
    this.assertCan(callerPermissions, 'users.update');
    const name = change.name.trim();
    if (!name) throw new SessionError('Name is required', 400);
    const email = normalizeEmail(change.email);
    const phone = normalizePhone(change.phone);
    if (!email && !phone) throw new SessionError('Email or phone is required', 400);

    const current = await this.options.users.findFirst({ where: { id: userId } });
    if (!current) throw new SessionError('User not found', 404);
    await this.assertContactFree(userId, email, phone);

    const user = await this.options.users.update({
      where: { id: userId },
      data: { name, email, phone },
    });
    return this.view(user);
  }

  async deactivate(callerPermissions: readonly string[], userId: string): Promise<UserView> {
    this.assertCan(callerPermissions, 'users.deactivate');
    const current = await this.options.users.findFirst({ where: { id: userId } });
    if (!current) throw new SessionError('User not found', 404);
    const user = await this.options.transaction(async (tx) => {
      await this.assertNotLastActiveOwner(tx, userId);
      const deactivatedAt = new Date();
      await tx.refreshTokens.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: deactivatedAt },
      });
      return tx.users.update({
        where: { id: userId },
        data: { deactivatedAt },
      });
    });
    return this.view(user);
  }

  async restore(callerPermissions: readonly string[], userId: string): Promise<UserView> {
    this.assertCan(callerPermissions, 'users.deactivate');
    const current = await this.options.users.findFirst({ where: { id: userId } });
    if (!current) throw new SessionError('User not found', 404);
    const user = await this.options.users.update({
      where: { id: userId },
      data: { deactivatedAt: null },
    });
    return this.view(user);
  }

  /** Active holders of `owner` are the ones who can still sign in. */
  private async assertNotLastActiveOwner(tx: SessionStores, userId: string): Promise<void> {
    const owner = await tx.roles.findFirst({ where: { slug: OWNER_ROLE_SLUG } });
    if (!owner) return;
    await tx.roles.update({ where: { id: owner.id }, data: { slug: owner.slug } });
    if (await isLastActiveHolder(tx, owner.id, userId)) {
      throw new SessionError('The last owner cannot be deactivated', 409);
    }
  }

  private async assertContactFree(
    userId: string,
    email: string | null,
    phone: string | null,
  ): Promise<void> {
    if (email) {
      const taken = await this.options.users.findFirst({ where: { email } });
      if (taken && taken.id !== userId) {
        throw new SessionError('An account with that email or phone already exists', 409);
      }
    }
    if (phone) {
      const taken = await this.options.users.findFirst({ where: { phone } });
      if (taken && taken.id !== userId) {
        throw new SessionError('An account with that email or phone already exists', 409);
      }
    }
  }

  private view(user: SessionUserRecord): UserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      deactivatedAt: user.deactivatedAt ? user.deactivatedAt.toISOString() : null,
    };
  }

  private assertCan(permissions: readonly string[], key: string): void {
    if (!permissions.includes(key)) {
      throw new SessionError('You do not have permission to do that', 403);
    }
  }
}

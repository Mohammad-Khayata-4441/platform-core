import { ConflictException, Injectable } from '@nestjs/common';
import { CrudRepository, TenantEntity } from './crud-repository';
import type { PrismaModelDelegate } from '../prisma/prisma-delegate.interface.js';

/**
 * Repository backstop for status-lifecycle documents (Phase 5.3.4).
 *
 * StatusGuardedCrudService already rejects deleting a non-DRAFT document with
 * a 400. This guard sits underneath it, so code that calls repository.delete()
 * directly still cannot hard-delete a posted or cancelled document: financial
 * documents are cancelled or reversed, never deleted. It answers 409, the same
 * status mapPrismaError uses for integrity refusals.
 *
 * A missing row is not refused here: the delete proceeds so Prisma's own
 * not-found error surfaces exactly as before.
 */
@Injectable()
export abstract class StatusGuardedCrudRepository<
  T extends TenantEntity & { status: string },
  TDelegate extends PrismaModelDelegate = PrismaModelDelegate,
> extends CrudRepository<T, TDelegate> {
  protected readonly deletableStatuses: readonly string[] = ['DRAFT'];
  protected readonly rejectionMessage = 'Resource is not in a deletable state.';

  protected override async beforeHardDelete(id: string): Promise<void> {
    const row: { status: string } | null = await this.model.findUnique({ where: { id }, select: { status: true } });
    if (row && !this.deletableStatuses.includes(row.status)) {
      throw new ConflictException(this.rejectionMessage);
    }
  }
}

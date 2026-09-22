import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PrismaDelegateArgField,
  PrismaDelegateData,
  PrismaModelDelegate,
} from '../prisma/prisma-delegate.interface.js';

// ── Entity contracts ─────────────────────────────────────────────────────────

export interface TenantEntity {
  id: string;
  tenantId: string;
}

// ── Query options ─────────────────────────────────────────────────────────────

/**
 * Filter/sort/include options for a list query. When the repository is
 * parameterized on its Prisma delegate these derive from the model's own
 * `WhereInput` / `OrderByInput` / `Include`, so an invalid filter field fails
 * to compile. The un-parameterized default stays open for generic callers.
 */
export interface FindManyOptions<D = PrismaModelDelegate> {
  skip?: number;
  take?: number;
  where?: PrismaDelegateArgField<D, 'findMany', 'where'>;
  orderBy?: PrismaDelegateArgField<D, 'findMany', 'orderBy'>;
  include?: PrismaDelegateArgField<D, 'findMany', 'include'>;
}

export interface FindManyResult<T> {
  data: T[];
  total: number;
}

// ── Prisma error → HTTP exception mapper ─────────────────────────────────────

function mapPrismaError(error: unknown): never {
  // Structural check — works for PrismaClientKnownRequestError and driver adapter wrappers alike
  if (error != null && typeof error === 'object' && 'code' in error) {
    const e = error as { code: string; meta?: { target?: unknown; field_name?: string; constraint?: string } };
    if (e.code === 'P2003') {
      throw new ConflictException(
        'Cannot complete operation: this record is referenced by another record and cannot be modified or deleted.',
      );
    }
    if (e.code === 'P2002') {
      const target = e.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : String(target ?? 'field');
      throw new ConflictException(`A record with this ${field} already exists.`);
    }
  }
  // Fallback: driver adapter FK errors that bubble up without a P-code
  if (
    error instanceof Error &&
    (error.message.includes('ForeignKeyConstraintViolation') ||
      error.message.toLowerCase().includes('foreign key constraint'))
  ) {
    throw new ConflictException(
      'Cannot complete operation: this record is referenced by another record and cannot be modified or deleted.',
    );
  }
  throw error;
}

// ── Base CRUD repository ──────────────────────────────────────────────────────

/**
 * Generic tenant-scoped CRUD repository.
 *
 * Extend this class and inject the Prisma delegate for your model. Parameterize
 * it on the delegate type so create/update/filter inputs come from Prisma:
 * ```ts
 * @Injectable()
 * export class UnitsRepository extends CrudRepository<Unit, Prisma.UnitDelegate> {
 *   constructor(private prisma: PrismaService) {
 *     super(prisma.unit);
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class CrudRepository<
  T extends TenantEntity,
  TDelegate extends PrismaModelDelegate = PrismaModelDelegate,
> {
  constructor(protected readonly model: TDelegate) {}

  /**
   * Find many records scoped to a tenant.
   * Automatically merges `tenantId` into the `where` clause.
   */
  async findMany(tenantId: string, options?: FindManyOptions<TDelegate>): Promise<FindManyResult<T>>;
  async findMany(tenantId: string, options: FindManyOptions = {}): Promise<FindManyResult<T>> {
    const { skip = 0, take = 10, where = {}, include } = options;
    const orderBy = options.orderBy ?? { createdAt: 'desc' };
    const scopedWhere = { ...where, tenantId };

    const [data, total] = await Promise.all([
      this.model.findMany({
        skip,
        take,
        where: scopedWhere,
        orderBy,
        ...(include ? { include } : {}),
      }),
      this.model.count({ where: scopedWhere }),
    ]);

    return { data, total };
  }

  /**
   * Find a single record by id within a tenant.
   * Returns null if not found.
   */
  async findById(tenantId: string, id: string): Promise<T | null> {
    return this.model.findFirst({ where: { id, tenantId } });
  }

  /**
   * Find a single record by id within a tenant, throwing if missing.
   */
  async findByIdOrFail(tenantId: string, id: string, resourceName = 'Resource'): Promise<T> {
    const entity = await this.findById(tenantId, id);
    if (!entity) {
      throw new NotFoundException(`${resourceName} with id "${id}" not found`);
    }
    return entity;
  }

  /**
   * Create a new record. Caller is responsible for including `tenantId` in data.
   */
  async create(data: PrismaDelegateData<TDelegate, 'create'>): Promise<T> {
    try {
      return await this.model.create({ data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Update a record by id.
   */
  async update(id: string, data: PrismaDelegateData<TDelegate, 'update'>): Promise<T> {
    try {
      return await this.model.update({ where: { id }, data });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Hard-delete a record by id. Runs {@link beforeHardDelete} first.
   */
  async delete(id: string): Promise<T> {
    await this.beforeHardDelete(id);
    try {
      return await this.model.delete({ where: { id } });
    } catch (error) {
      mapPrismaError(error);
    }
  }

  /**
   * Last-line refusal hook for hard deletes, independent of any service guard.
   * No-op by default; see StatusGuardedCrudRepository.
   */
  protected async beforeHardDelete(_id: string): Promise<void> {}

  /**
   * Check whether a record matching `where` (scoped to tenant) exists.
   */
  async exists(
    tenantId: string,
    where: PrismaDelegateArgField<TDelegate, 'findMany', 'where'>,
  ): Promise<boolean>;
  async exists(tenantId: string, where: any): Promise<boolean> {
    const count = await this.model.count({ where: { ...where, tenantId } });
    return count > 0;
  }
}

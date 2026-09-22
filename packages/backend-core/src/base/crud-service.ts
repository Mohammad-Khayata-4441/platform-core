import { Injectable } from '@nestjs/common';
import { CrudRepository, TenantEntity, FindManyOptions } from './crud-repository';
import { CrudPresenter } from './crud-presenter';
import {
  ResourceCreatedEvent,
  ResourceUpdatedEvent,
  ResourceDeletedEvent,
} from './crud-events';
import type { BulkResult, BulkError } from './bulk.dto.js';

/**
 * Minimal event emitter interface — satisfied by EventEmitter2 from @nestjs/event-emitter.
 * Using an interface keeps backend-core free of a hard @nestjs/event-emitter dependency.
 */
export interface IEventEmitter {
  emit(event: string, payload: unknown): boolean | void;
}

/**
 * Generic tenant-scoped CRUD service.
 *
 * Extend this class, implement `resourceName`, and inject your repository,
 * presenter, and (optionally) an EventEmitter2 instance:
 *
 * ```ts
 * @Injectable()
 * export class UnitsService extends CrudService<Unit, UnitResponseDto, CreateUnitDto, UpdateUnitDto> {
 *   protected readonly resourceName = 'unit';
 *
 *   constructor(
 *     repo: UnitsRepository,
 *     presenter: UnitPresenter,
 *     eventEmitter: EventEmitter2,
 *   ) {
 *     super(repo, presenter, eventEmitter);
 *   }
 * }
 * ```
 *
 * ### Lifecycle hooks
 * Override the `before*` hooks for validation / business rules:
 * - `beforeCreate` — uniqueness checks, data enrichment, etc.
 * - `beforeUpdate` — uniqueness on rename, status transition guards, etc.
 * - `beforeDelete` — FK constraint checks, soft-delete guards, etc.
 *
 * The base class automatically emits `ResourceCreatedEvent`, `ResourceUpdatedEvent`,
 * and `ResourceDeletedEvent` after each mutation. Override `onCreated/onUpdated/onDeleted`
 * only for **additional** side effects (send email, invalidate cache, etc.) —
 * not for event re-emission which the base already handles.
 */

export interface ICrudService<TResponse, TCreateDto, TUpdateDto> {
  list(tenantId: string, options: Record<string, any>): Promise<{ data: TResponse[]; total: number }>;
  findById(tenantId: string, id: string): Promise<TResponse>;
  create(tenantId: string, dto: TCreateDto): Promise<TResponse>;
  update(tenantId: string, id: string, dto: TUpdateDto): Promise<TResponse>;
  delete(tenantId: string, id: string): Promise<void>;
  /** Bulk partial update. Each item is `{ id } & Partial<TUpdateDto>`. */
  bulkUpdate(
    tenantId: string,
    items: Array<{ id: string } & Partial<TUpdateDto>>,
  ): Promise<BulkResult>;
  /** Bulk delete by id. */
  bulkDelete(tenantId: string, ids: string[]): Promise<BulkResult>;
}


@Injectable()
export abstract class CrudService<
  TEntity extends TenantEntity,
  TResponse,
  TCreateDto,
  TUpdateDto,
> implements ICrudService<TResponse, TCreateDto, TUpdateDto> {
  protected abstract readonly resourceName: string;

  constructor(
    protected readonly repository: CrudRepository<TEntity>,
    protected readonly presenter: CrudPresenter<TEntity, TResponse>,
    protected readonly eventEmitter?: IEventEmitter,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  async list(
    tenantId: string,
    options: FindManyOptions = {},
  ): Promise<{ data: TResponse[]; total: number }> {
    const result = await this.repository.findMany(tenantId, options);
    return {
      data: this.presenter.toResponseList(result.data),
      total: result.total,
    };
  }

  async findById(tenantId: string, id: string): Promise<TResponse> {
    const entity = await this.repository.findByIdOrFail(tenantId, id, this.resourceName);
    return this.presenter.toResponse(entity);
  }

  async create(tenantId: string, dto: TCreateDto): Promise<TResponse> {
    await this.beforeCreate(tenantId, dto);
    const entity = await this.repository.create({ tenantId, ...(dto as Record<string, any>) });
    await this.onCreated(tenantId, entity);
    this.eventEmitter?.emit(
      ResourceCreatedEvent.eventName(this.resourceName),
      new ResourceCreatedEvent(tenantId, this.resourceName, entity),
    );
    return this.presenter.toResponse(entity);
  }

  async update(tenantId: string, id: string, dto: TUpdateDto): Promise<TResponse> {
    const existing = await this.repository.findByIdOrFail(tenantId, id, this.resourceName);
    await this.beforeUpdate(tenantId, id, dto, existing);
    const updated = await this.repository.update(id, dto as Record<string, any>);
    await this.onUpdated(tenantId, updated, existing);
    this.eventEmitter?.emit(
      ResourceUpdatedEvent.eventName(this.resourceName),
      new ResourceUpdatedEvent(tenantId, this.resourceName, updated, existing),
    );
    return this.presenter.toResponse(updated);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const existing = await this.repository.findByIdOrFail(tenantId, id, this.resourceName);
    await this.beforeDelete(tenantId, id, existing);
    await this.repository.delete(id);
    await this.onDeleted(tenantId, existing);
    this.eventEmitter?.emit(
      ResourceDeletedEvent.eventName(this.resourceName),
      new ResourceDeletedEvent(tenantId, this.resourceName, existing),
    );
  }

  /**
   * Bulk partial update — iterates {@link update} per item, aggregating errors.
   * A failed item is counted as `failed` and recorded in `errors`; remaining
   * items still attempt. Override for transactional / batch-SQL semantics.
   */
  async bulkUpdate(
    tenantId: string,
    items: Array<{ id: string } & Partial<TUpdateDto>>,
  ): Promise<BulkResult> {
    const result: BulkResult = { total: items.length, succeeded: 0, failed: 0, errors: [] };
    for (const item of items) {
      const { id, ...partial } = item as { id: string } & Partial<TUpdateDto>;
      try {
        await this.update(tenantId, id, partial as TUpdateDto);
        result.succeeded += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          id,
          message: error instanceof Error ? error.message : 'Update failed for this item',
        } satisfies BulkError);
      }
    }
    return result;
  }

  /**
   * Bulk delete — iterates {@link delete} per id, aggregating errors.
   * A failed id is counted as `failed` and recorded in `errors`; remaining
   * ids still attempt. Override for transactional / batch semantics.
   */
  async bulkDelete(tenantId: string, ids: string[]): Promise<BulkResult> {
    const result: BulkResult = { total: ids.length, succeeded: 0, failed: 0, errors: [] };
    for (const id of ids) {
      try {
        await this.delete(tenantId, id);
        result.succeeded += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          id,
          message: error instanceof Error ? error.message : 'Delete failed for this item',
        } satisfies BulkError);
      }
    }
    return result;
  }

  // ── Lifecycle hooks (override in concrete class) ──────────────────────────

  /** Run before create — throw to abort. Good for uniqueness / enrichment. */
  protected async beforeCreate(_tenantId: string, _dto: TCreateDto): Promise<void> {}

  /** Run before update — throw to abort. Receives the current entity snapshot. */
  protected async beforeUpdate(
    _tenantId: string,
    _id: string,
    _dto: TUpdateDto,
    _existing: TEntity,
  ): Promise<void> {}

  /** Run before delete — throw to abort. Receives the entity about to be deleted. */
  protected async beforeDelete(
    _tenantId: string,
    _id: string,
    _existing: TEntity,
  ): Promise<void> {}

  /** Override for additional side effects after create (email, cache, etc.). Base already emits ResourceCreatedEvent. */
  protected async onCreated(_tenantId: string, _entity: TEntity): Promise<void> {}

  /** Override for additional side effects after update. Base already emits ResourceUpdatedEvent. */
  protected async onUpdated(_tenantId: string, _entity: TEntity, _previous: TEntity): Promise<void> {}

  /** Override for additional side effects after delete. Base already emits ResourceDeletedEvent. */
  protected async onDeleted(_tenantId: string, _entity: TEntity): Promise<void> {}
}

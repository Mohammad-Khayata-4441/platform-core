import { Injectable, BadRequestException } from '@nestjs/common';
import { CrudService } from './crud-service';
import type { IEventEmitter } from './crud-service';
import { CrudRepository, TenantEntity } from './crud-repository';
import { CrudPresenter } from './crud-presenter';

export interface IDocumentNumberAllocator {
  getNextNumber(tenantId: string, documentType: string): Promise<string>;
}

@Injectable()
export abstract class StatusGuardedCrudService<
  TEntity extends TenantEntity & { status: string },
  TResponse,
  TCreateDto,
  TUpdateDto,
> extends CrudService<TEntity, TResponse, TCreateDto, TUpdateDto> {

  protected abstract readonly documentType: string;
  /** Statuses in which updates/deletes are allowed. Override per resource. */
  protected readonly mutableStatuses: readonly string[] = ['DRAFT'];
  /** Message used when a guarded mutation is rejected. */
  protected readonly rejectionMessage = 'Resource is not in an editable state.';

  constructor(
    repository: CrudRepository<TEntity>,
    presenter: CrudPresenter<TEntity, TResponse>,
    protected readonly numberAllocator: IDocumentNumberAllocator,
    eventEmitter?: IEventEmitter,
  ) {
    super(repository, presenter, eventEmitter);
  }

  abstract createAs(tenantId: string, userId: string, dto: TCreateDto): Promise<TResponse>;

  protected override async beforeUpdate(
    _tenantId: string,
    _id: string,
    _dto: TUpdateDto,
    existing: TEntity,
  ): Promise<void> {
    if (!this.mutableStatuses.includes(existing.status)) {
      throw new BadRequestException(this.rejectionMessage);
    }
  }

  protected override async beforeDelete(
    _tenantId: string,
    _id: string,
    existing: TEntity,
  ): Promise<void> {
    if (!this.mutableStatuses.includes(existing.status)) {
      throw new BadRequestException(this.rejectionMessage);
    }
  }
}

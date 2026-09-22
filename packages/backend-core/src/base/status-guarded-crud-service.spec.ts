import { BadRequestException } from '@nestjs/common';
import { StatusGuardedCrudService, IDocumentNumberAllocator } from './status-guarded-crud-service';
import { CrudRepository, TenantEntity } from './crud-repository';
import { CrudPresenter } from './crud-presenter';

interface TestEntity extends TenantEntity {
  status: string;
  number: string;
  createdBy: string;
}

interface TestResponse { id: string; status: string; number: string }
interface TestCreate { amount: number }
interface TestUpdate { amount?: number }

class TestRepository extends CrudRepository<TestEntity> {
  constructor() { super(null as any); }
  override async findMany() { return { data: [], total: 0 }; }
  override async findByIdOrFail(_t: string, id: string) {
    return { id, tenantId: 't1', status: 'POSTED', number: 'DOC-001', createdBy: 'u1' } as TestEntity;
  }
  override async findById() { return null; }
  override async create(data: any) { return data as TestEntity; }
  override async update(id: string, data: any) { return { id, ...data } as TestEntity; }
  override async delete() {}
}

class TestPresenter extends CrudPresenter<TestEntity, TestResponse> {
  toResponse(entity: TestEntity): TestResponse {
    return { id: entity.id, status: entity.status, number: entity.number };
  }
}

class TestService extends StatusGuardedCrudService<TestEntity, TestResponse, TestCreate, TestUpdate> {
  protected readonly resourceName = 'test-document';
  protected readonly documentType = 'TEST';

  constructor(repo: CrudRepository<TestEntity>, presenter: CrudPresenter<TestEntity, TestResponse>, allocator: IDocumentNumberAllocator) {
    super(repo, presenter, allocator);
  }

  async createAs(tenantId: string, userId: string, dto: TestCreate): Promise<TestResponse> {
    const number = await this.numberAllocator.getNextNumber(tenantId, this.documentType);
    const entity = await this.repository.create({
      tenantId, number, status: 'DRAFT', createdBy: userId, ...(dto as any),
    });
    return this.presenter.toResponse(entity);
  }
}

function buildDeps(entityStatus = 'POSTED') {
  const repo = new TestRepository();
  jest.spyOn(repo, 'findByIdOrFail').mockResolvedValue({
    id: 'doc-1', tenantId: 't1', status: entityStatus, number: 'DOC-001', createdBy: 'u1',
  } as TestEntity);
  const presenter = new TestPresenter();
  const allocator: IDocumentNumberAllocator = {
    getNextNumber: jest.fn().mockResolvedValue('TEST-00001'),
  };
  const service = new TestService(repo, presenter, allocator);
  return { service, repo, presenter, allocator };
}

describe('StatusGuardedCrudService', () => {
  describe('beforeUpdate', () => {
    it('rejects update on a POSTED document', async () => {
      const { service } = buildDeps('POSTED');
      await expect(service.update('t1', 'doc-1', { amount: 100 }))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects update on a CANCELLED document', async () => {
      const { service } = buildDeps('CANCELLED');
      await expect(service.update('t1', 'doc-1', { amount: 100 }))
        .rejects.toThrow(BadRequestException);
    });

    it('allows update on a DRAFT document', async () => {
      const { service, repo } = buildDeps('DRAFT');
      jest.spyOn(repo, 'update').mockResolvedValue({
        id: 'doc-1', tenantId: 't1', status: 'DRAFT', number: 'DOC-001', createdBy: 'u1',
      } as TestEntity);
      const result = await service.update('t1', 'doc-1', { amount: 100 });
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('beforeDelete', () => {
    it('rejects delete on a POSTED document', async () => {
      const { service } = buildDeps('POSTED');
      await expect(service.delete('t1', 'doc-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('allows delete on a DRAFT document', async () => {
      const { service, repo } = buildDeps('DRAFT');
      jest.spyOn(repo, 'delete').mockResolvedValue(undefined as any);
      await expect(service.delete('t1', 'doc-1')).resolves.toBeUndefined();
    });
  });

  describe('createAs', () => {
    it('allocates a document number and creates with actor', async () => {
      const { service, allocator, repo } = buildDeps('DRAFT');
      const createSpy = jest.spyOn(repo, 'create').mockResolvedValue({
        id: 'doc-1', tenantId: 't1', status: 'DRAFT', number: 'TEST-00001', createdBy: 'u1',
      } as TestEntity);

      const result = await service.createAs('t1', 'u1', { amount: 500 });

      expect(allocator.getNextNumber).toHaveBeenCalledWith('t1', 'TEST');
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 't1', number: 'TEST-00001', createdBy: 'u1' }),
      );
      expect(result.number).toBe('TEST-00001');
    });
  });
});

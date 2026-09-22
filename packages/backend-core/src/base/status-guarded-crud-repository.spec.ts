import { ConflictException } from '@nestjs/common';
import { StatusGuardedCrudRepository } from './status-guarded-crud-repository';
import { CrudRepository, TenantEntity } from './crud-repository';

interface Doc extends TenantEntity {
  status: string;
}

class DocRepository extends StatusGuardedCrudRepository<Doc> {}
class PlainRepository extends CrudRepository<Doc> {}

function model(row: { status: string } | null) {
  return {
    findUnique: jest.fn().mockResolvedValue(row),
    delete: jest.fn().mockResolvedValue({ id: 'd1' }),
  };
}

describe('StatusGuardedCrudRepository', () => {
  it.each(['POSTED', 'CANCELLED'])('refuses to hard-delete a %s row with 409', async (status) => {
    const m = model({ status });

    await expect(new DocRepository(m).delete('d1')).rejects.toThrow(ConflictException);
    expect(m.delete).not.toHaveBeenCalled();
  });

  it('hard-deletes a DRAFT row', async () => {
    const m = model({ status: 'DRAFT' });

    await new DocRepository(m).delete('d1');

    expect(m.findUnique).toHaveBeenCalledWith({ where: { id: 'd1' }, select: { status: true } });
    expect(m.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('lets a missing row fall through to the delete, preserving its not-found error', async () => {
    const m = model(null);

    await new DocRepository(m).delete('d1');

    expect(m.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });

  it('leaves plain CrudRepository deletes unchanged (no status read)', async () => {
    const m = model({ status: 'POSTED' });

    await new PlainRepository(m).delete('d1');

    expect(m.findUnique).not.toHaveBeenCalled();
    expect(m.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });
});

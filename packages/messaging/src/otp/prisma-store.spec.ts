import { describe, expect, it, vi } from 'vitest';
import { createPrismaOtpStore } from './prisma-store.js';
import type { OtpRecord, PrismaOtpDelegate } from './types.js';

describe('createPrismaOtpStore', () => {
  it('writes expiresAt and matches either identifier when verifying', async () => {
    const created: OtpRecord = {
      id: '1',
      email: null,
      phone: '+100',
      code: '654321',
      expiresAt: new Date('2026-10-02T00:05:00Z'),
      createdAt: new Date('2026-10-02T00:00:00Z'),
    };
    const delegate: PrismaOtpDelegate = {
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue(created),
      findFirst: vi.fn().mockResolvedValue(created),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    };
    const store = createPrismaOtpStore(delegate);
    const since = new Date('2026-10-01T00:00:00Z');
    await store.countSince({ phone: '+100' }, since);
    expect(delegate.count).toHaveBeenCalledWith({
      where: { phone: '+100', createdAt: { gte: since } },
    });

    await store.save(created);
    expect(delegate.create).toHaveBeenCalledWith({
      data: {
        email: null,
        phone: '+100',
        code: '654321',
        expiresAt: created.expiresAt,
        createdAt: created.createdAt,
      },
    });

    const now = new Date('2026-10-02T00:01:00Z');
    await store.findActive({ email: 'a@b.c', phone: '+100' }, '654321', now);
    expect(delegate.findFirst).toHaveBeenCalledWith({
      where: {
        code: '654321',
        OR: [{ email: 'a@b.c' }, { phone: '+100' }],
        expiresAt: { gt: now },
      },
    });

    await store.consume({ phone: '+100' });
    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ phone: '+100' }] },
    });
  });
});

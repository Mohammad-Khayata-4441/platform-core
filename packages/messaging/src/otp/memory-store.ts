import { randomUUID } from 'node:crypto';
import type { OtpIdentifier, OtpRecord, OtpStore } from './types.js';

function matchesAnd(row: OtpRecord, identifier: OtpIdentifier): boolean {
  if (identifier.email !== undefined && row.email !== identifier.email) return false;
  if (identifier.phone !== undefined && row.phone !== identifier.phone) return false;
  return identifier.email !== undefined || identifier.phone !== undefined;
}

function matchesOr(row: OtpRecord, identifier: OtpIdentifier): boolean {
  if (identifier.email !== undefined && row.email === identifier.email) return true;
  if (identifier.phone !== undefined && row.phone === identifier.phone) return true;
  return false;
}

/** Process-local store. Use `createPrismaOtpStore` when codes must outlive the process. */
export class MemoryOtpStore implements OtpStore {
  private readonly rows: OtpRecord[] = [];

  async countSince(identifier: OtpIdentifier, since: Date): Promise<number> {
    return this.rows.filter((row) => row.createdAt >= since && matchesAnd(row, identifier)).length;
  }

  async save(record: Omit<OtpRecord, 'id'> & { id?: string }): Promise<OtpRecord> {
    const stored: OtpRecord = { ...record, id: record.id ?? randomUUID() };
    this.rows.push(stored);
    return stored;
  }

  async findActive(identifier: OtpIdentifier, code: string, now: Date): Promise<OtpRecord | null> {
    return (
      this.rows.find(
        (row) => row.code === code && row.expiresAt > now && matchesOr(row, identifier),
      ) ?? null
    );
  }

  async consume(identifier: OtpIdentifier): Promise<void> {
    for (let index = this.rows.length - 1; index >= 0; index -= 1) {
      const row = this.rows[index];
      if (row && matchesOr(row, identifier)) this.rows.splice(index, 1);
    }
  }
}

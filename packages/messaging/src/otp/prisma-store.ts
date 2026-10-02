import type { OtpIdentifier, OtpStore, PrismaOtpDelegate } from './types.js';

function identifierWhere(identifier: OtpIdentifier): Record<string, string> {
  const where: Record<string, string> = {};
  if (identifier.email) where.email = identifier.email;
  if (identifier.phone) where.phone = identifier.phone;
  return where;
}

function identifierOr(identifier: OtpIdentifier): Array<Record<string, string>> {
  const or: Array<Record<string, string>> = [];
  if (identifier.email) or.push({ email: identifier.email });
  if (identifier.phone) or.push({ phone: identifier.phone });
  return or;
}

export function createPrismaOtpStore(otpCode: PrismaOtpDelegate): OtpStore {
  return {
    countSince(identifier, since) {
      return otpCode.count({
        where: { ...identifierWhere(identifier), createdAt: { gte: since } },
      });
    },
    save(record) {
      return otpCode.create({
        data: {
          email: record.email,
          phone: record.phone,
          code: record.code,
          expiresAt: record.expiresAt,
          createdAt: record.createdAt,
        },
      });
    },
    findActive(identifier, code, now) {
      return otpCode.findFirst({
        where: {
          code,
          OR: identifierOr(identifier),
          expiresAt: { gt: now },
        },
      });
    },
    async consume(identifier) {
      await otpCode.deleteMany({ where: { OR: identifierOr(identifier) } });
    },
  };
}

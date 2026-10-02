export interface OtpIdentifier {
  email?: string;
  phone?: string;
}

export interface OtpRecord {
  id: string;
  email: string | null;
  phone: string | null;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface OtpStore {
  /** Count codes created at or after `since` for this identifier (email AND phone when both are set). */
  countSince(identifier: OtpIdentifier, since: Date): Promise<number>;
  save(record: Omit<OtpRecord, 'id'> & { id?: string }): Promise<OtpRecord>;
  /** Active code whose email OR phone matches, and whose expiry is still in the future. */
  findActive(identifier: OtpIdentifier, code: string, now: Date): Promise<OtpRecord | null>;
  /** Delete every stored code for this identifier. */
  consume(identifier: OtpIdentifier): Promise<void>;
}

/** Structural slice of `prisma.otpCode`. The package does not depend on Prisma. */
export interface PrismaOtpDelegate {
  count(args: { where: Record<string, unknown> }): Promise<number>;
  create(args: { data: Record<string, unknown> }): Promise<OtpRecord>;
  findFirst(args: { where: Record<string, unknown> }): Promise<OtpRecord | null>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<unknown>;
}

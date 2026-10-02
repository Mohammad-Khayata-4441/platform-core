import { randomInt } from 'node:crypto';
import type { MessagingLogger } from '../logger.js';
import { silentLogger } from '../logger.js';
import { MemoryOtpStore } from './memory-store.js';
import type { OtpIdentifier, OtpRecord, OtpStore } from './types.js';

export type OtpErrorCode = 'MISSING_IDENTIFIER' | 'MISCONFIGURED' | 'RATE_LIMITED' | 'INVALID';

export class OtpError extends Error {
  readonly code: OtpErrorCode;
  readonly status: 400 | 429 | 500;

  constructor(code: OtpErrorCode, message: string, status: 400 | 429 | 500) {
    super(message);
    this.name = 'OtpError';
    this.code = code;
    this.status = status;
  }
}

export interface OtpOptions {
  /** When false, no code is stored. `devCode` is returned and accepted instead. */
  enabled: boolean;
  devCode?: string;
  /** Defaults to 5 minutes. */
  ttlMs?: number;
  /** Defaults to 1 hour. */
  rateLimitWindowMs?: number;
  /** Defaults to 5 codes per identifier per window. */
  maxPerWindow?: number;
  store?: OtpStore;
  logger?: MessagingLogger;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_MAX_PER_WINDOW = 5;

export class OtpService {
  private readonly store: OtpStore;
  private readonly logger: MessagingLogger;
  private readonly ttlMs: number;
  private readonly windowMs: number;
  private readonly maxPerWindow: number;

  constructor(private readonly options: OtpOptions) {
    this.store = options.store ?? new MemoryOtpStore();
    this.logger = options.logger ?? silentLogger;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.windowMs = options.rateLimitWindowMs ?? DEFAULT_WINDOW_MS;
    this.maxPerWindow = options.maxPerWindow ?? DEFAULT_MAX_PER_WINDOW;
  }

  async generateOtp(payload: OtpIdentifier): Promise<OtpRecord> {
    const identifier = this.identifier(payload);
    if (!identifier.email && !identifier.phone) {
      throw new OtpError(
        'MISSING_IDENTIFIER',
        'Email or phone is required to generate OTP',
        400,
      );
    }

    if (!this.options.enabled) {
      if (!this.options.devCode) {
        this.logger.error(
          'OTP_ENABLED is false and DEV_OTP_CODE is not configured; cannot generate OTP',
        );
        throw new OtpError(
          'MISCONFIGURED',
          'OTP generation is misconfigured: set OTP_ENABLED=true or DEV_OTP_CODE',
          500,
        );
      }
      this.logger.log(
        `OTP is disabled. Returning DEV_OTP_CODE for ${this.label(identifier)}`,
      );
      return this.synthetic(identifier, this.options.devCode);
    }

    const since = new Date(Date.now() - this.windowMs);
    const recent = await this.store.countSince(identifier, since);
    if (recent >= this.maxPerWindow) {
      this.logger.warn(
        `OTP rate limit exceeded for ${this.label(identifier)}: ${recent} requests within the rate window`,
      );
      throw new OtpError(
        'RATE_LIMITED',
        'Too many OTP requests. Please try again after some time.',
        429,
      );
    }

    const now = new Date();
    return this.store.save({
      email: identifier.email ?? null,
      phone: identifier.phone ?? null,
      code: String(randomInt(100_000, 1_000_000)),
      expiresAt: new Date(now.getTime() + this.ttlMs),
      createdAt: now,
    });
  }

  /**
   * Accepts `devCode` without reading the store whenever it is configured.
   * A matching stored code is single-use: every code for that identifier is deleted.
   */
  async verifyOtp(payload: OtpIdentifier & { code?: string }): Promise<OtpRecord> {
    const identifier = this.identifier(payload);
    const code = payload.code;
    if (!code || (!identifier.email && !identifier.phone)) {
      this.logger.error('Missing code or both email and phone; cannot verify OTP');
      throw new OtpError('MISSING_IDENTIFIER', 'Missing code or identifier for OTP', 400);
    }

    if (identifier.email) this.logger.log(`Verifying OTP for email: ${identifier.email}`);
    if (identifier.phone) this.logger.log(`Verifying OTP for phone: ${identifier.phone}`);

    if (this.options.devCode && code === this.options.devCode) {
      this.logger.log(`OTP verification succeeded using DEV_OTP_CODE for ${this.label(identifier)}`);
      return this.synthetic(identifier, this.options.devCode);
    }

    const record = await this.store.findActive(identifier, code, new Date());
    this.logger.log(
      `OTP verification result for ${this.label(identifier)}: ${record ? 'success' : 'failure'}`,
    );
    if (!record) {
      this.logger.error(`OTP verification failed for ${this.label(identifier)}`);
      throw new OtpError('INVALID', 'Invalid or expired OTP', 400);
    }

    await this.store.consume(identifier);
    return record;
  }

  private identifier(payload: OtpIdentifier): OtpIdentifier {
    const identifier: OtpIdentifier = {};
    if (payload.email) identifier.email = payload.email;
    if (payload.phone) identifier.phone = payload.phone;
    return identifier;
  }

  private synthetic(identifier: OtpIdentifier, code: string): OtpRecord {
    const now = new Date();
    return {
      id: 'dev',
      email: identifier.email ?? null,
      phone: identifier.phone ?? null,
      code,
      expiresAt: new Date(now.getTime() + this.ttlMs),
      createdAt: now,
    };
  }

  private label(identifier: OtpIdentifier): string {
    return identifier.phone ? `phone ${identifier.phone}` : `email ${identifier.email}`;
  }
}

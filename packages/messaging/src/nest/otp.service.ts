import { HttpException, Inject, Injectable } from '@nestjs/common';
import type { MessagingConfig } from '../config.js';
import { OtpError, OtpService as CoreOtpService } from '../otp/otp.service.js';
import type { OtpIdentifier, OtpRecord } from '../otp/types.js';
import { nestLogger } from './logger.js';
import { MESSAGING_OPTIONS } from './tokens.js';

@Injectable()
export class OtpService {
  private readonly core: CoreOtpService;

  constructor(@Inject(MESSAGING_OPTIONS) options: MessagingConfig) {
    this.core = new CoreOtpService({
      enabled: options.otp?.enabled ?? false,
      devCode: options.otp?.devCode,
      ttlMs: options.otp?.ttlMs,
      rateLimitWindowMs: options.otp?.rateLimitWindowMs,
      maxPerWindow: options.otp?.maxPerWindow,
      store: options.otp?.store,
      logger: nestLogger(OtpService.name),
    });
  }

  generateOtp(payload: OtpIdentifier): Promise<OtpRecord> {
    return this.guard(() => this.core.generateOtp(payload));
  }

  verifyOtp(payload: OtpIdentifier & { code?: string }): Promise<OtpRecord> {
    return this.guard(() => this.core.verifyOtp(payload));
  }

  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof OtpError) throw new HttpException(error.message, error.status);
      throw error;
    }
  }
}

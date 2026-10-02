import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { OtpService } from './otp.service.js';

describe('Nest OtpService', () => {
  it('turns a rate limit into an HTTP 429', async () => {
    const service = new OtpService({ otp: { enabled: true, maxPerWindow: 1 } });
    await service.generateOtp({ phone: '+100' });
    try {
      await service.generateOtp({ phone: '+100' });
      throw new Error('expected a 429');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });
});

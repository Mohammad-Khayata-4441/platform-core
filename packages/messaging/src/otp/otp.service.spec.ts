import { describe, expect, it } from 'vitest';
import { silentLogger } from '../logger.js';
import { MemoryOtpStore } from './memory-store.js';
import { OtpError, OtpService } from './otp.service.js';

function service(options: ConstructorParameters<typeof OtpService>[0]) {
  return new OtpService({ logger: silentLogger, store: new MemoryOtpStore(), ...options });
}

describe('OtpService', () => {
  it('rejects the 6th code for the same phone inside the window', async () => {
    const otp = service({ enabled: true });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await otp.generateOtp({ phone: '+100' });
    }
    await expect(otp.generateOtp({ phone: '+100' })).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
    await expect(otp.generateOtp({ phone: '+200' })).resolves.toMatchObject({ phone: '+200' });
  });

  it('stores a 6-digit code that expires in 5 minutes', async () => {
    const otp = service({ enabled: true });
    const before = Date.now();
    const record = await otp.generateOtp({ email: 'a@b.c' });
    expect(record.code).toMatch(/^\d{6}$/);
    const ttl = record.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(4 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(5 * 60 * 1000 + 50);
  });

  it('consumes a code on successful verification', async () => {
    const otp = service({ enabled: true });
    const record = await otp.generateOtp({ phone: '+100' });
    await expect(otp.verifyOtp({ phone: '+100', code: record.code })).resolves.toMatchObject({
      code: record.code,
    });
    await expect(otp.verifyOtp({ phone: '+100', code: record.code })).rejects.toBeInstanceOf(OtpError);
  });

  it('accepts the dev code without reading the store', async () => {
    const store = new MemoryOtpStore();
    const otp = new OtpService({ enabled: true, devCode: '123456', store, logger: silentLogger });
    await expect(otp.verifyOtp({ phone: '+100', code: '123456' })).resolves.toMatchObject({
      code: '123456',
      phone: '+100',
    });
    await expect(otp.verifyOtp({ email: 'a@b.c', code: '000000' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('returns the dev code when OTP delivery is disabled', async () => {
    const otp = service({ enabled: false, devCode: '123456' });
    await expect(otp.generateOtp({ email: 'a@b.c' })).resolves.toMatchObject({
      code: '123456',
      email: 'a@b.c',
      phone: null,
    });
  });

  it('fails closed when OTP is disabled and no dev code is configured', async () => {
    const otp = service({ enabled: false });
    await expect(otp.generateOtp({ phone: '+100' })).rejects.toMatchObject({ status: 500 });
  });

  it('requires an identifier and a code', async () => {
    const otp = service({ enabled: true });
    await expect(otp.generateOtp({})).rejects.toMatchObject({ status: 400 });
    await expect(otp.verifyOtp({ phone: '+100' })).rejects.toMatchObject({ status: 400 });
  });
});

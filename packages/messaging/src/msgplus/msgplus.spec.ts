import { describe, expect, it, vi } from 'vitest';
import { silentLogger } from '../logger.js';
import { MsgPlusService } from './msgplus.js';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('MsgPlusService', () => {
  it('posts the OTP template and strips a leading plus', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ sms_log_id: 9 }));
    const service = new MsgPlusService({
      apiKey: 'key',
      senderId: 3,
      otpTemplateId: 8,
      fetchImpl,
      logger: silentLogger,
    });

    await expect(service.sendOtp('+963900', '123456')).resolves.toMatchObject({ sms_log_id: 9 });

    const call = fetchImpl.mock.calls[0];
    expect(call?.[0]).toBe('https://sms.msgplus.tech/api/v1/send');
    const init = call?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer key' });
    expect(JSON.parse(String(init.body))).toEqual({
      sender_id: 3,
      template_id: 8,
      numbers: ['963900'],
      vars: { P1: '123456' },
    });
  });

  it('does not call MsgPlus when the OTP policy is disabled', async () => {
    const fetchImpl = vi.fn();
    const service = new MsgPlusService({
      policy: { enabled: false, devCode: '123456' },
      fetchImpl,
      logger: silentLogger,
    });
    await expect(service.sendOtp('+100', '999999')).resolves.toMatchObject({
      code: '123456',
      phone: '+100',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(service.isConfigured()).toBe(false);
  });

  it('throws when a live send is missing credentials', async () => {
    const service = new MsgPlusService({ apiKey: 'key', logger: silentLogger });
    await expect(service.sendOtp('+100', '123456')).rejects.toThrow(
      'MSG_PLUS_SENDER_ID is not configured.',
    );
  });

  it('reports the MsgPlus status when the API rejects the send', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'no' }, 503));
    const service = new MsgPlusService({
      apiKey: 'key',
      senderId: 1,
      otpTemplateId: 2,
      fetchImpl,
      logger: silentLogger,
    });
    await expect(service.sendOtp('100', '123456')).rejects.toThrow(
      'Failed to send SMS via MsgPlus: 503',
    );
  });
});

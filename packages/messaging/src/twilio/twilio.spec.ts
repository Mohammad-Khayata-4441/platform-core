import { describe, expect, it, vi } from 'vitest';
import { silentLogger } from '../logger.js';
import { TwilioService } from './twilio.js';

describe('TwilioService', () => {
  it('sends a WhatsApp content template and prefixes both numbers', async () => {
    const create = vi.fn().mockResolvedValue({ sid: 'SM1' });
    const createClient = vi.fn().mockResolvedValue({ messages: { create } });
    const service = new TwilioService({
      apiSid: 'sid',
      apiSecret: 'secret',
      accountSid: 'AC',
      contentSid: 'HX',
      whatsappFrom: '+1555',
      createClient,
      logger: silentLogger,
    });

    await expect(service.sendWhatsAppOtp('+1999', '654321')).resolves.toMatchObject({ sid: 'SM1' });
    await service.sendWhatsAppOtp('whatsapp:+1999', '654321');

    expect(createClient).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      from: 'whatsapp:+1555',
      to: 'whatsapp:+1999',
      contentSid: 'HX',
      contentVariables: JSON.stringify({ '1': '654321' }),
    });
    expect(service.isConfigured()).toBe(true);
  });

  it('does not construct a Twilio client when OTP delivery is disabled', async () => {
    const createClient = vi.fn();
    const service = new TwilioService({
      policy: { enabled: false, devCode: '111111' },
      createClient,
      logger: silentLogger,
    });
    await expect(service.sendWhatsAppOtp('+100', '222222')).resolves.toMatchObject({
      code: '111111',
      phone: '+100',
      email: null,
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('names the missing credential', async () => {
    const service = new TwilioService({
      apiSid: 'sid',
      apiSecret: 'secret',
      accountSid: 'AC',
      logger: silentLogger,
    });
    await expect(service.sendWhatsAppOtp('+100', '123456')).rejects.toThrow('TWILIO_CONTENT_SID');
  });
});

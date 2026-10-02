import { describe, expect, it } from 'vitest';
import { messagingConfigFromEnv } from './config.js';

describe('messagingConfigFromEnv', () => {
  it('leaves every channel off when no credentials are set', () => {
    expect(messagingConfigFromEnv({})).toEqual({ otp: { enabled: false } });
  });

  it('reads MsgPlus, Twilio, and mail only from the vars that are present', () => {
    const config = messagingConfigFromEnv({
      OTP_ENABLED: 'true',
      DEV_OTP_CODE: '123456',
      MSG_PLUS_API_KEY: 'key',
      MSG_PLUS_SENDER_ID: '12',
      MSG_PLUS_OTP_TEMPLATE_ID: '34',
      TWILIO_SID: 'sid',
      TWILIO_WHATSAPP_FROM: '+1555',
      MAIL_USER: 'app@example.com',
      MAIL_FROM_NAME: 'Acme',
    });

    expect(config.otp).toEqual({ enabled: true, devCode: '123456' });
    expect(config.msgplus).toMatchObject({
      apiKey: 'key',
      senderId: 12,
      otpTemplateId: 34,
      policy: { enabled: true, devCode: '123456' },
    });
    expect(config.twilio).toMatchObject({
      apiSid: 'sid',
      whatsappFrom: '+1555',
    });
    expect(config.twilio?.apiSecret).toBeUndefined();
    expect(config.mail?.config).toMatchObject({
      host: 'smtp.gmail.com',
      port: 587,
      user: 'app@example.com',
      fromName: 'Acme',
      fromEmail: 'app@example.com',
    });
    expect(JSON.stringify(config)).not.toContain('E-Dukan');
  });
});

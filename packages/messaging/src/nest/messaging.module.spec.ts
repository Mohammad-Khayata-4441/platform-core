import { describe, expect, it } from 'vitest';
import { MailService } from '../mail/mail.js';
import { MsgPlusService } from '../msgplus/msgplus.js';
import { TwilioService } from '../twilio/twilio.js';
import { MessagingModule } from './messaging.module.js';
import { OtpService } from './otp.service.js';

describe('MessagingModule', () => {
  it('registers every channel without turning them on by itself', () => {
    const dynamic = MessagingModule.forRoot({ otp: { enabled: false, devCode: '123456' } });
    expect(dynamic.global).toBe(true);
    expect(dynamic.exports).toEqual(
      expect.arrayContaining([OtpService, MsgPlusService, TwilioService, MailService]),
    );
  });
});

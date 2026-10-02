import { describe, expect, it, vi } from 'vitest';
import { silentLogger } from '../logger.js';
import { MailService } from './mail.js';
import { EmailTemplates } from './templates.js';
import type { MailConfig } from './types.js';

const config: MailConfig = {
  host: 'smtp.example',
  port: 587,
  secure: false,
  user: 'u',
  password: 'p',
  fromName: 'App',
  fromEmail: 'app@example.com',
  replyTo: 'reply@example.com',
};

describe('MailService', () => {
  it('sends from the configured address', async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: 'm1',
      accepted: ['a@b.c'],
      rejected: [],
      pending: [],
      response: 'ok',
    });
    const mail = new MailService({ config, transport: { sendMail }, logger: silentLogger });
    await mail.sendMail({ to: ['a@b.c', 'c@d.e'], subject: 'Hi', text: 't' });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"App" <app@example.com>',
        replyTo: 'reply@example.com',
        to: ['a@b.c', 'c@d.e'],
        subject: 'Hi',
      }),
    );
  });

  it('skips OTP email when the policy is disabled and still sends ordinary mail', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'm1', response: 'ok' });
    const mail = new MailService({
      config,
      policy: { enabled: false, devCode: '123456' },
      transport: { sendMail },
      logger: silentLogger,
    });
    await expect(mail.sendOtpMail('a@b.c', '999999')).resolves.toBeNull();
    await mail.sendMail({ to: 'a@b.c', subject: 'Receipt', text: 'thanks' });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('sends the verification code when OTP delivery is enabled', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'm1', response: 'ok' });
    const mail = new MailService({ config, transport: { sendMail }, logger: silentLogger });
    await mail.sendOtpMail('a@b.c', '654321');
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your verification code',
        text: 'Your verification code is 654321',
      }),
    );
  });

  it('continues a bulk send after one recipient fails', async () => {
    const sendMail = vi
      .fn()
      .mockRejectedValueOnce(new Error('mailbox full'))
      .mockResolvedValueOnce({ messageId: 'm2', accepted: ['b@b.c'], response: 'ok' });
    const mail = new MailService({ config, transport: { sendMail }, logger: silentLogger });
    const results = await mail.sendBulkMail(['a@b.c', 'b@b.c'], { subject: 'Hi', text: 't' });
    expect(results[0]?.rejected).toEqual(['a@b.c']);
    expect(results[1]?.messageId).toBe('m2');
  });
});

describe('EmailTemplates', () => {
  it('uses the caller brand and escapes the recipient name', () => {
    const template = EmailTemplates.welcomeEmail({
      name: '<script>',
      brandName: 'Acme',
      verificationLink: 'https://example.com/verify',
    });
    expect(template.subject).toBe('Welcome to Acme');
    expect(template.html).toContain('Acme');
    expect(template.html).toContain('&lt;script&gt;');
    expect(template.html).not.toContain('E-Dukan');
    expect(template.html).not.toContain('<script>');
  });
});

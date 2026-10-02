import type { EmailTemplate, EmailTemplateData } from './types.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function text(value: EmailTemplateData[string], fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export class EmailTemplates {
  /** `content` is HTML the caller already built. `title` is escaped. */
  static createBasicTemplate(content: string, title?: string): string {
    const safeTitle = title ? escapeHtml(title) : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle || 'Email'}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px;background:#f4f4f4;">
  <div style="background:#fff;padding:30px;border-radius:8px;">
    ${safeTitle ? `<h1 style="color:#007bff;font-size:24px;margin:0 0 20px;">${safeTitle}</h1>` : ''}
    <div>${content}</div>
    <p style="margin-top:30px;padding-top:20px;border-top:1px solid #e0e0e0;font-size:12px;color:#666;text-align:center;">This is an automated message, please do not reply.</p>
  </div>
</body>
</html>`;
  }

  static welcomeEmail(data: EmailTemplateData): EmailTemplate {
    const name = escapeHtml(text(data.name, 'there'));
    const brand = escapeHtml(text(data.brandName, 'the platform'));
    const link = data.verificationLink ? escapeHtml(String(data.verificationLink)) : '';
    const html = this.createBasicTemplate(
      `<h2>Welcome, ${name}!</h2>
      <p>Thank you for joining ${brand}.</p>
      ${
        link
          ? `<p>Verify your email address:</p><p><a href="${link}">${link}</a></p>`
          : ''
      }`,
      `Welcome to ${text(data.brandName, 'the platform')}`,
    );
    return {
      subject: `Welcome to ${text(data.brandName, 'the platform')}`,
      text: `Welcome, ${text(data.name, 'there')}! Thank you for joining ${text(data.brandName, 'the platform')}.${link ? ` Verify your email: ${text(data.verificationLink)}` : ''}`,
      html,
    };
  }

  static passwordResetEmail(data: EmailTemplateData): EmailTemplate {
    const name = escapeHtml(text(data.name, 'there'));
    const resetLink = escapeHtml(text(data.resetLink));
    const expiresIn = escapeHtml(text(data.expiresIn, '1 hour'));
    const html = this.createBasicTemplate(
      `<h2>Password reset request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link expires in ${expiresIn}.</p>
      <p>If you did not request a reset, you can ignore this email.</p>`,
      'Reset your password',
    );
    return {
      subject: 'Reset your password',
      text: `Hi ${text(data.name, 'there')}, reset your password: ${text(data.resetLink)} This link expires in ${text(data.expiresIn, '1 hour')}.`,
      html,
    };
  }

  /** `message` is inserted as HTML. Escape it before calling when it comes from a user. */
  static notificationEmail(data: EmailTemplateData): EmailTemplate {
    const name = escapeHtml(text(data.name, 'there'));
    const title = text(data.title, 'Notification');
    const message = text(data.message);
    const actionLink = data.actionLink ? escapeHtml(String(data.actionLink)) : '';
    const actionText = escapeHtml(text(data.actionText, 'Open'));
    const html = this.createBasicTemplate(
      `<h2>${escapeHtml(title)}</h2>
      <p>Hi ${name},</p>
      <div>${message}</div>
      ${actionLink ? `<p><a href="${actionLink}">${actionText}</a></p>` : ''}`,
      title,
    );
    return {
      subject: title,
      text: `${title}\n\nHi ${text(data.name, 'there')},\n\n${message}${actionLink ? `\n\n${text(data.actionText, 'Open')}: ${text(data.actionLink)}` : ''}`,
      html,
    };
  }
}

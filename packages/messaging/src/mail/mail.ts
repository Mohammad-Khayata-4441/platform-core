import nodemailer from 'nodemailer';
import type { MessagingLogger } from '../logger.js';
import { silentLogger } from '../logger.js';
import type { OtpDeliveryPolicy } from '../policy.js';
import type {
  EmailTemplate,
  MailConfig,
  MailOptions,
  MailTransport,
  MailTransportResult,
  OutboundMail,
  SendMailResult,
} from './types.js';

export interface MailServiceOptions {
  config?: MailConfig;
  /** Applied only to `sendOtpMail`. Other mail methods always try to send. */
  policy?: OtpDeliveryPolicy;
  transport?: MailTransport;
  logger?: MessagingLogger;
}

export class MailService {
  private readonly config: MailConfig | undefined;
  private readonly policy: OtpDeliveryPolicy;
  private readonly logger: MessagingLogger;
  private transport: MailTransport | undefined;

  constructor(options: MailServiceOptions = {}) {
    this.config = options.config;
    this.policy = options.policy ?? { enabled: true };
    this.transport = options.transport;
    this.logger = options.logger ?? silentLogger;
    if (this.isConfigured()) this.logger.log('Mail service initialized successfully');
    else this.logger.warn('Mail is not configured.');
  }

  async sendMail(options: MailOptions): Promise<SendMailResult> {
    const recipient = formatRecipient(options.to);
    try {
      const result = await this.transportOrThrow().sendMail(this.outbound(options));
      this.logger.log(`Email sent successfully to ${recipient}`);
      return toResult(result);
    } catch (error) {
      this.logger.error(`Failed to send email to ${recipient}`, error);
      throw error;
    }
  }

  async sendTemplateMail(
    to: string | string[],
    template: EmailTemplate,
    from?: string,
  ): Promise<SendMailResult> {
    return this.sendMail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
      from,
    });
  }

  /**
   * When the OTP policy is disabled, no email is sent and this returns null.
   * The caller still has the code from `OtpService`.
   */
  async sendOtpMail(
    to: string | string[],
    otpCode: string,
    from?: string,
  ): Promise<SendMailResult | null> {
    const recipient = formatRecipient(to);
    if (!this.policy.enabled) {
      this.logger.log(
        `OTP is disabled. Skipping OTP email to ${recipient} and using DEV_OTP_CODE.`,
      );
      return null;
    }
    return this.sendMail({
      to,
      subject: 'Your verification code',
      text: `Your verification code is ${otpCode}`,
      html: `<p>Your verification code is <strong>${otpCode}</strong>.</p>`,
      from,
    });
  }

  async sendBulkMail(
    recipients: string[],
    options: Omit<MailOptions, 'to'>,
  ): Promise<SendMailResult[]> {
    const results: SendMailResult[] = [];
    for (const recipient of recipients) {
      try {
        results.push(await this.sendMail({ ...options, to: recipient }));
      } catch (error) {
        this.logger.error(`Failed to send email to ${recipient}`, error);
        results.push({
          messageId: '',
          accepted: [],
          rejected: [recipient],
          pending: [],
          response: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return results;
  }

  async testConnection(testEmail?: string): Promise<boolean> {
    if (!testEmail) {
      this.logger.warn('No test email provided for connection test');
      return false;
    }
    try {
      await this.transportOrThrow().sendMail({
        from: this.defaultFrom(),
        to: testEmail,
        subject: 'Connection Test',
        text: 'This is a test email to verify the mail connection.',
        html: '<p>This is a test email to verify the mail connection.</p>',
        replyTo: this.replyTo(),
      });
      this.logger.log('Mail connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Mail connection test failed', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return Boolean(this.config?.host && this.config.fromEmail) || Boolean(this.transport);
  }

  private outbound(options: MailOptions): OutboundMail {
    return {
      from: options.from || this.defaultFrom(),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: this.replyTo(),
      attachments: options.attachments,
    };
  }

  private defaultFrom(): string {
    if (!this.config) throw new Error('Mail is not configured.');
    return `"${this.config.fromName}" <${this.config.fromEmail}>`;
  }

  private replyTo(): string | undefined {
    if (!this.config) return undefined;
    return this.config.replyTo || this.config.fromEmail;
  }

  private transportOrThrow(): MailTransport {
    if (this.transport) return this.transport;
    if (!this.config) throw new Error('Mail is not configured.');
    const config = this.config;
    const created = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
    });
    this.transport = {
      sendMail: (options) => created.sendMail(options),
    };
    return this.transport;
  }
}

function formatRecipient(to: string | string[]): string {
  return Array.isArray(to) ? to.join(', ') : to;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === 'string') return item;
    if (isRecord(item) && typeof item.address === 'string') return item.address;
    return String(item);
  });
}

function toResult(result: MailTransportResult): SendMailResult {
  return {
    messageId: result.messageId ?? '',
    accepted: asStringList(result.accepted),
    rejected: asStringList(result.rejected),
    pending: asStringList(result.pending),
    response: result.response ?? 'Email sent successfully',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

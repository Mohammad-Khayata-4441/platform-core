import type { MessagingLogger } from '../logger.js';
import { silentLogger } from '../logger.js';
import { skippedOtpMessage, type OtpDeliveryPolicy } from '../policy.js';

export interface TwilioMessage {
  sid: string;
}

export interface TwilioMessagesClient {
  messages: {
    create(payload: {
      from: string;
      to: string;
      contentSid: string;
      contentVariables: string;
    }): Promise<TwilioMessage>;
  };
}

export type TwilioClientFactory = (
  apiSid: string,
  apiSecret: string,
  options: { accountSid: string },
) => TwilioMessagesClient | Promise<TwilioMessagesClient>;

export interface TwilioConfig {
  apiSid?: string;
  apiSecret?: string;
  accountSid?: string;
  contentSid?: string;
  whatsappFrom?: string;
  /** When `enabled` is false, `sendWhatsAppOtp` does not call Twilio. Defaults to sending. */
  policy?: OtpDeliveryPolicy;
  createClient?: TwilioClientFactory;
  logger?: MessagingLogger;
}

async function defaultTwilioFactory(
  apiSid: string,
  apiSecret: string,
  options: { accountSid: string },
): Promise<TwilioMessagesClient> {
  const imported = (await import('twilio')) as {
    default?: TwilioClientFactory;
  };
  const factory = imported.default;
  if (typeof factory !== 'function') {
    throw new Error('Twilio SDK did not export a client factory.');
  }
  return factory(apiSid, apiSecret, options);
}

export class TwilioService {
  private readonly apiSid: string | undefined;
  private readonly apiSecret: string | undefined;
  private readonly accountSid: string | undefined;
  private readonly contentSid: string | undefined;
  private readonly whatsappFrom: string | undefined;
  private readonly policy: OtpDeliveryPolicy;
  private readonly createClient: TwilioClientFactory;
  private readonly logger: MessagingLogger;
  private clientPromise: Promise<TwilioMessagesClient> | null = null;

  constructor(config: TwilioConfig = {}) {
    this.apiSid = config.apiSid;
    this.apiSecret = config.apiSecret;
    this.accountSid = config.accountSid;
    this.contentSid = config.contentSid;
    this.whatsappFrom = config.whatsappFrom;
    this.policy = config.policy ?? { enabled: true };
    this.createClient = config.createClient ?? defaultTwilioFactory;
    this.logger = config.logger ?? silentLogger;

    if (!this.apiSid || !this.apiSecret || !this.accountSid) {
      this.logger.warn(
        'Twilio credentials not configured. TWILIO_SID, TWILIO_SECRET, and TWILIO_ACCOUNT_SID are required.',
      );
    }
  }

  async sendWhatsAppOtp(phoneNumber: string, otpCode: string): Promise<unknown> {
    if (!this.policy.enabled) {
      this.logger.log(
        `OTP is disabled. Skipping WhatsApp send to ${phoneNumber} and using DEV_OTP_CODE.`,
      );
      return {
        message: skippedOtpMessage(this.policy.devCode),
        code: this.policy.devCode,
        email: null,
        phone: phoneNumber,
      };
    }

    if (!this.apiSid || !this.apiSecret || !this.accountSid) {
      throw new Error(
        'Twilio client is not initialized. Please check your Twilio configuration.',
      );
    }
    if (!this.contentSid) {
      throw new Error(
        'TWILIO_CONTENT_SID is not configured. Please set it in your environment variables.',
      );
    }
    if (!this.whatsappFrom) {
      throw new Error(
        'TWILIO_WHATSAPP_FROM is not configured. Please set it in your environment variables.',
      );
    }

    const formattedTo = withWhatsAppPrefix(phoneNumber);
    const formattedFrom = withWhatsAppPrefix(this.whatsappFrom);

    try {
      const client = await this.client();
      const message = await client.messages.create({
        from: formattedFrom,
        to: formattedTo,
        contentSid: this.contentSid,
        contentVariables: JSON.stringify({ '1': otpCode }),
      });
      this.logger.log(
        `WhatsApp OTP sent successfully to ${formattedTo}. Message SID: ${message.sid}`,
      );
      return message;
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp OTP to ${formattedTo}`, error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.apiSid &&
        this.apiSecret &&
        this.accountSid &&
        this.contentSid &&
        this.whatsappFrom,
    );
  }

  private client(): Promise<TwilioMessagesClient> {
    if (!this.apiSid || !this.apiSecret || !this.accountSid) {
      return Promise.reject(
        new Error('Twilio client is not initialized. Please check your Twilio configuration.'),
      );
    }
    if (!this.clientPromise) {
      const apiSid = this.apiSid;
      const apiSecret = this.apiSecret;
      const accountSid = this.accountSid;
      this.clientPromise = Promise.resolve(
        this.createClient(apiSid, apiSecret, { accountSid }),
      )
        .then((client) => {
          this.logger.log('Twilio client initialized successfully');
          return client;
        })
        .catch((error: unknown) => {
          this.clientPromise = null;
          this.logger.error('Failed to initialize Twilio client', error);
          throw error;
        });
    }
    return this.clientPromise;
  }
}

function withWhatsAppPrefix(phone: string): string {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

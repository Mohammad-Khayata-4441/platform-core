import type { MessagingLogger } from '../logger.js';
import { silentLogger } from '../logger.js';
import { skippedOtpMessage, type OtpDeliveryPolicy } from '../policy.js';

const DEFAULT_BASE_URL = 'https://sms.msgplus.tech/api/v1';

export interface MsgPlusConfig {
  apiKey?: string;
  senderId?: number;
  otpTemplateId?: number;
  baseUrl?: string;
  /** When `enabled` is false, `sendOtp` does not call MsgPlus. Defaults to sending. */
  policy?: OtpDeliveryPolicy;
  fetchImpl?: typeof fetch;
  logger?: MessagingLogger;
}

export class MsgPlusService {
  private readonly apiKey: string | undefined;
  private readonly senderId: number | undefined;
  private readonly otpTemplateId: number | undefined;
  private readonly baseUrl: string;
  private readonly policy: OtpDeliveryPolicy;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: MessagingLogger;

  constructor(config: MsgPlusConfig = {}) {
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
    this.otpTemplateId = config.otpTemplateId;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.policy = config.policy ?? { enabled: true };
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.logger = config.logger ?? silentLogger;

    if (!this.apiKey) this.logger.warn('MSG_PLUS_API_KEY is not configured.');
    else this.logger.log('MsgPlus service initialized successfully');
  }

  async sendOtp(phoneNumber: string, otpCode: string): Promise<unknown> {
    if (!this.policy.enabled) {
      this.logger.log(
        `OTP is disabled. Skipping SMS send to ${phoneNumber} and using DEV_OTP_CODE.`,
      );
      return {
        message: skippedOtpMessage(this.policy.devCode),
        code: this.policy.devCode,
        phone: phoneNumber,
      };
    }

    if (!this.apiKey) throw new Error('MSG_PLUS_API_KEY is not configured.');
    if (!this.senderId) throw new Error('MSG_PLUS_SENDER_ID is not configured.');
    if (!this.otpTemplateId) throw new Error('MSG_PLUS_OTP_TEMPLATE_ID is not configured.');

    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Timestamp': String(timestamp),
        },
        body: JSON.stringify({
          sender_id: this.senderId,
          template_id: this.otpTemplateId,
          numbers: [normalizedPhone],
          vars: { P1: otpCode },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(`MsgPlus API error: ${response.status} - ${errorBody}`);
        throw new Error(`Failed to send SMS via MsgPlus: ${response.status}`);
      }

      const data: unknown = await response.json();
      const logId = isRecord(data) ? data.sms_log_id : undefined;
      this.logger.log(`SMS OTP sent successfully to ${normalizedPhone}. Log ID: ${String(logId)}`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send SMS OTP to ${normalizedPhone}`, error);
      throw error;
    }
  }

  async getBalance(): Promise<unknown> {
    return this.get('/balance', 'Failed to fetch balance');
  }

  async getSmsStatus(smsLogId: number): Promise<unknown> {
    return this.get(`/sms/${smsLogId}/status`, 'Failed to fetch SMS status');
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.senderId && this.otpTemplateId);
  }

  private async get(path: string, failure: string): Promise<unknown> {
    if (!this.apiKey) throw new Error('MSG_PLUS_API_KEY is not configured.');
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) throw new Error(`${failure}: ${response.status}`);
    return response.json();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

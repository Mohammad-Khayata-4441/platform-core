import type { MailServiceOptions } from './mail/mail.js';
import type { MailConfig } from './mail/types.js';
import type { MsgPlusConfig } from './msgplus/msgplus.js';
import type { OtpOptions } from './otp/otp.service.js';
import { readOtpEnabled, type OtpDeliveryPolicy } from './policy.js';
import type { TwilioConfig } from './twilio/twilio.js';

export interface MessagingConfig {
  /** Omit when the app does not issue codes. Defaults to disabled inside the Nest module. */
  otp?: OtpOptions;
  msgplus?: MsgPlusConfig;
  twilio?: TwilioConfig;
  mail?: MailServiceOptions;
}

type Env = Record<string, string | undefined>;

function readNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function policyFromEnv(env: Env): OtpDeliveryPolicy {
  const policy: OtpDeliveryPolicy = { enabled: readOtpEnabled(env.OTP_ENABLED) };
  if (env.DEV_OTP_CODE) policy.devCode = env.DEV_OTP_CODE;
  return policy;
}

function present(env: Env, keys: string[]): boolean {
  return keys.some((key) => {
    const value = env[key];
    return value !== undefined && value !== '';
  });
}

function mailConfig(env: Env): MailConfig | undefined {
  if (!present(env, ['MAIL_HOST', 'MAIL_USER', 'MAIL_FROM_EMAIL', 'MAIL_PASSWORD'])) {
    return undefined;
  }
  const user = env.MAIL_USER ?? '';
  const fromEmail = env.MAIL_FROM_EMAIL || user;
  const config: MailConfig = {
    host: env.MAIL_HOST || 'smtp.gmail.com',
    port: readNumber(env.MAIL_PORT) ?? 587,
    secure: env.MAIL_SECURE === 'true',
    user,
    password: env.MAIL_PASSWORD ?? '',
    fromName: env.MAIL_FROM_NAME || 'App',
    fromEmail,
  };
  if (env.MAIL_REPLY_TO) config.replyTo = env.MAIL_REPLY_TO;
  return config;
}

/**
 * Reads the same env names as e-dukan. Channels with no credentials are omitted,
 * so an app can call this and only the configured transports are active.
 * `OTP_ENABLED` defaults to off. `DEV_OTP_CODE`, when set, is accepted by OTP verify.
 */
export function messagingConfigFromEnv(env: Env = process.env): MessagingConfig {
  const policy = policyFromEnv(env);
  const otp: OtpOptions = { enabled: policy.enabled };
  if (policy.devCode) otp.devCode = policy.devCode;

  const config: MessagingConfig = { otp };

  if (present(env, ['MSG_PLUS_API_KEY', 'MSG_PLUS_SENDER_ID', 'MSG_PLUS_OTP_TEMPLATE_ID'])) {
    const msgplus: MsgPlusConfig = { policy };
    if (env.MSG_PLUS_API_KEY) msgplus.apiKey = env.MSG_PLUS_API_KEY;
    const senderId = readNumber(env.MSG_PLUS_SENDER_ID);
    const otpTemplateId = readNumber(env.MSG_PLUS_OTP_TEMPLATE_ID);
    if (senderId !== undefined) msgplus.senderId = senderId;
    if (otpTemplateId !== undefined) msgplus.otpTemplateId = otpTemplateId;
    config.msgplus = msgplus;
  }

  if (
    present(env, [
      'TWILIO_SID',
      'TWILIO_SECRET',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_CONTENT_SID',
      'TWILIO_WHATSAPP_FROM',
    ])
  ) {
    const twilio: TwilioConfig = { policy };
    if (env.TWILIO_SID) twilio.apiSid = env.TWILIO_SID;
    if (env.TWILIO_SECRET) twilio.apiSecret = env.TWILIO_SECRET;
    if (env.TWILIO_ACCOUNT_SID) twilio.accountSid = env.TWILIO_ACCOUNT_SID;
    if (env.TWILIO_CONTENT_SID) twilio.contentSid = env.TWILIO_CONTENT_SID;
    if (env.TWILIO_WHATSAPP_FROM) twilio.whatsappFrom = env.TWILIO_WHATSAPP_FROM;
    config.twilio = twilio;
  }

  const smtp = mailConfig(env);
  if (smtp) config.mail = { config: smtp, policy };

  return config;
}

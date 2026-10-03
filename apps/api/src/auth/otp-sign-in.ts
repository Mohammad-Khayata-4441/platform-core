import { SessionError, type OtpSignIn } from '@core/auth/nest';
import {
  MailService,
  MsgPlusService,
  OtpError,
  OtpService,
  TwilioService,
  messagingConfigFromEnv,
} from '@core/messaging';

export interface OtpMessage {
  email?: string;
  phone?: string;
  code: string;
}

/** Records or delivers the one message a code request sends. */
export interface OtpSender {
  send(message: OtpMessage): Promise<void>;
}

interface OtpIssuer {
  generateOtp(input: { email?: string; phone?: string }): Promise<{ code: string }>;
  verifyOtp(input: { email?: string; phone?: string; code?: string }): Promise<unknown>;
}

interface OtpChannels {
  mail: {
    isConfigured(): boolean;
    sendOtpMail(to: string, code: string): Promise<unknown>;
  };
  sms: {
    isConfigured(): boolean;
    sendOtp(phone: string, code: string): Promise<unknown>;
  };
  whatsapp: {
    isConfigured(): boolean;
    sendWhatsAppOtp(phone: string, code: string): Promise<unknown>;
  };
}

/**
 * Issue a code through the messaging package and hand it to `sender` only when
 * delivery is on. A deployment with delivery off still accepts its dev code.
 */
export function createOtpSignIn(
  otp: OtpIssuer,
  sender: OtpSender,
  deliveryEnabled: boolean,
): OtpSignIn {
  return {
    async request(input) {
      try {
        const record = await otp.generateOtp(input);
        if (!deliveryEnabled) return;
        const message: OtpMessage = { code: record.code };
        if (input.email) message.email = input.email;
        if (input.phone) message.phone = input.phone;
        await sender.send(message);
      } catch (error) {
        rethrow(error);
      }
    },
    async verify(input) {
      try {
        await otp.verifyOtp(input);
      } catch (error) {
        rethrow(error);
      }
    },
  };
}

/** Email goes through mail. A phone goes through SMS, then WhatsApp. */
export function createMessagingSender(channels: OtpChannels): OtpSender {
  return {
    async send(message) {
      if (message.email) {
        if (!channels.mail.isConfigured()) throw new SessionError('OTP is not configured', 400);
        await channels.mail.sendOtpMail(message.email, message.code);
        return;
      }
      if (message.phone && channels.sms.isConfigured()) {
        await channels.sms.sendOtp(message.phone, message.code);
        return;
      }
      if (message.phone && channels.whatsapp.isConfigured()) {
        await channels.whatsapp.sendWhatsAppOtp(message.phone, message.code);
        return;
      }
      throw new SessionError('OTP is not configured', 400);
    },
  };
}

/**
 * OTP sign-in for a deployment that set `OTP_ENABLED` or `DEV_OTP_CODE`.
 * Returns nothing when messaging is not configured, so the routes refuse.
 */
export function otpSignInFromEnv(
  env: Record<string, string | undefined> = process.env,
): OtpSignIn | undefined {
  const messaging = messagingConfigFromEnv(env);
  const issued = messaging.otp;
  if (!issued?.enabled && !issued?.devCode) return undefined;
  return createOtpSignIn(
    new OtpService({
      enabled: issued.enabled,
      devCode: issued.devCode,
      ttlMs: issued.ttlMs,
      rateLimitWindowMs: issued.rateLimitWindowMs,
      maxPerWindow: issued.maxPerWindow,
    }),
    createMessagingSender({
      mail: new MailService(messaging.mail ?? {}),
      sms: new MsgPlusService(messaging.msgplus ?? {}),
      whatsapp: new TwilioService(messaging.twilio ?? {}),
    }),
    issued.enabled,
  );
}

function rethrow(error: unknown): never {
  if (error instanceof OtpError) throw new SessionError(error.message, error.status);
  throw error;
}

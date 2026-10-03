# @core/messaging

Opt-in OTP, email, MsgPlus SMS, and Twilio WhatsApp. The API imports it for OTP sign-in when `OTP_ENABLED` or `DEV_OTP_CODE` is set. Other apps add the dependency when they send codes.

Login, users, and JWT stay in `@core/auth`. This package only issues a code, remembers it, and delivers it.

## Use it without Nest

```ts
import {
  EmailTemplates,
  MailService,
  MsgPlusService,
  OtpService,
  TwilioService,
  createPrismaOtpStore,
  messagingConfigFromEnv,
} from '@core/messaging';

const config = messagingConfigFromEnv();
const otp = new OtpService({ ...config.otp, store: createPrismaOtpStore(prisma.otpCode) });

const issued = await otp.generateOtp({ phone });
await new MsgPlusService(config.msgplus).sendOtp(phone, issued.code);
// or: new TwilioService(config.twilio).sendWhatsAppOtp(phone, issued.code)
// or: new MailService(config.mail).sendOtpMail(email, issued.code)

await otp.verifyOtp({ phone, code });
```

`OtpService` keeps codes in memory until you pass a store. Copy `prisma/otp.prisma` into the app schema when codes must survive a restart. The expiry column is `expiresAt` (`e-dukan` spelled this `expriesAt`).

A channel sends for real unless you pass `policy: { enabled: false, devCode }`. `messagingConfigFromEnv()` sets that policy from `OTP_ENABLED` and `DEV_OTP_CODE`. `OTP_ENABLED` defaults to off. When `DEV_OTP_CODE` is set, `verifyOtp` accepts it without reading the store. Do not set that variable in production.

Ordinary email (`sendMail`, `sendTemplateMail`) is not gated by the OTP policy. `EmailTemplates.welcomeEmail({ brandName })` takes the product name from the caller.

## Use it from Nest

```ts
import { messagingConfigFromEnv, MessagingModule } from '@core/messaging/nest';

@Module({
  imports: [MessagingModule.forRoot(messagingConfigFromEnv())],
})
export class AppModule {}
```

`MessagingModule` is global. Inject `OtpService`, `MsgPlusService`, `TwilioService`, or `MailService`. The Nest `OtpService` turns `OtpError` into an HTTP 400, 429, or 500. The other channels throw `Error` when they are asked to send without credentials.

`forRootAsync` is there when the options come from `ConfigService`.

## Env

| Variable | Channel |
|---|---|
| `OTP_ENABLED` | `true` or `1` stores and sends real codes. Anything else uses `DEV_OTP_CODE`. |
| `DEV_OTP_CODE` | Accepted by verify whenever it is set. |
| `MSG_PLUS_API_KEY`, `MSG_PLUS_SENDER_ID`, `MSG_PLUS_OTP_TEMPLATE_ID` | MsgPlus SMS. The code is template variable `P1`. |
| `TWILIO_SID`, `TWILIO_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_CONTENT_SID`, `TWILIO_WHATSAPP_FROM` | WhatsApp content template variable `1`. The SDK loads on the first send. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`, `MAIL_REPLY_TO` | SMTP via nodemailer. |

Channels with none of their variables set are omitted. `isConfigured()` reports whether a send would have the credentials it needs.

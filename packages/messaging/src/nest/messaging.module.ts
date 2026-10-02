import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import type { MessagingConfig } from '../config.js';
import { MailService, type MailServiceOptions } from '../mail/mail.js';
import { MsgPlusService, type MsgPlusConfig } from '../msgplus/msgplus.js';
import type { OtpDeliveryPolicy } from '../policy.js';
import { TwilioService, type TwilioConfig } from '../twilio/twilio.js';
import { nestLogger } from './logger.js';
import { OtpService } from './otp.service.js';
import { MESSAGING_OPTIONS } from './tokens.js';

export interface MessagingModuleAsyncOptions {
  imports?: ModuleMetadata['imports'];
  inject?: InjectionToken[];
  useFactory: (...args: unknown[]) => MessagingConfig | Promise<MessagingConfig>;
}

@Module({})
export class MessagingModule {
  /** Register only in an app that wants OTP, email, MsgPlus, or Twilio. */
  static forRoot(options: MessagingConfig): DynamicModule {
    return this.build([{ provide: MESSAGING_OPTIONS, useValue: options }]);
  }

  static forRootAsync(options: MessagingModuleAsyncOptions): DynamicModule {
    return this.build(
      [
        {
          provide: MESSAGING_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ],
      options.imports,
    );
  }

  private static build(
    optionProviders: DynamicModule['providers'],
    imports?: ModuleMetadata['imports'],
  ): DynamicModule {
    return {
      module: MessagingModule,
      global: true,
      imports: imports ?? [],
      providers: [
        ...(optionProviders ?? []),
        OtpService,
        {
          provide: MsgPlusService,
          useFactory: (options: MessagingConfig) =>
            new MsgPlusService(withPolicy(options.msgplus, options, nestLogger(MsgPlusService.name))),
          inject: [MESSAGING_OPTIONS],
        },
        {
          provide: TwilioService,
          useFactory: (options: MessagingConfig) =>
            new TwilioService(withPolicy(options.twilio, options, nestLogger(TwilioService.name))),
          inject: [MESSAGING_OPTIONS],
        },
        {
          provide: MailService,
          useFactory: (options: MessagingConfig) =>
            new MailService({
              ...options.mail,
              policy: options.mail?.policy ?? policyOf(options),
              logger: options.mail?.logger ?? nestLogger(MailService.name),
            }),
          inject: [MESSAGING_OPTIONS],
        },
      ],
      exports: [OtpService, MsgPlusService, TwilioService, MailService],
    };
  }
}

function policyOf(options: MessagingConfig): OtpDeliveryPolicy {
  return {
    enabled: options.otp?.enabled ?? true,
    devCode: options.otp?.devCode,
  };
}

function withPolicy<T extends { policy?: OtpDeliveryPolicy; logger?: MsgPlusConfig['logger'] }>(
  channel: T | undefined,
  options: MessagingConfig,
  logger: NonNullable<MsgPlusConfig['logger']>,
): T {
  return {
    ...channel,
    policy: channel?.policy ?? policyOf(options),
    logger: channel?.logger ?? logger,
  } as T;
}

export type { MailServiceOptions, MsgPlusConfig, TwilioConfig };

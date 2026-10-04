import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import { RoleService } from '../session/roles.js';
import { UserService } from '../session/users.js';
import type { GoogleSignIn } from '../session/google.js';
import type { OtpSignIn } from '../session/otp.js';
import { SessionService, type SessionServiceOptions } from '../session/session.js';
import type { SessionDelegate } from '../session/types.js';
import { AuthController } from './auth.controller.js';
import { RolesController, UserRolesController } from './roles.controller.js';
import { UsersController } from './users.controller.js';
import { AUTH_OPTIONS } from './auth.tokens.js';
import { ACCESS_TOKEN_VERIFIER } from './guards.js';

export { AUTH_OPTIONS };

export interface AuthModuleOptions extends SessionServiceOptions {
  /** When omitted, cookies are `Secure` only in production. */
  cookieSecure?: boolean;
  /** When omitted, OTP routes refuse and do not create a session. */
  otp?: OtpSignIn;
  /** When omitted, the Google route refuses and does not create a session. */
  google?: GoogleSignIn;
  /**
   * Boot upserts the permission catalog. Spec generation sets this to false
   * because the document does not depend on those rows.
   */
  syncCatalogOnBoot?: boolean;
}

export interface AuthModuleAsyncOptions<T extends unknown[] = unknown[]> {
  imports?: ModuleMetadata['imports'];
  inject?: InjectionToken[];
  useFactory: (...args: T) => AuthModuleOptions | Promise<AuthModuleOptions>;
}

@Module({})
export class AuthModule {
  /** Password sessions. The app passes Prisma accessors; this package does not import the database. */
  static forRoot(options: AuthModuleOptions): DynamicModule {
    return this.build([{ provide: AUTH_OPTIONS, useValue: options }]);
  }

  static forRootAsync<T extends unknown[]>(options: AuthModuleAsyncOptions<T>): DynamicModule {
    return this.build(
      [
        {
          provide: AUTH_OPTIONS,
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
      module: AuthModule,
      imports: imports ?? [],
      controllers: [AuthController, RolesController, UserRolesController, UsersController],
      providers: [
        ...(optionProviders ?? []),
        {
          provide: RoleService,
          useFactory: (options: AuthModuleOptions) => new RoleService(options),
          inject: [AUTH_OPTIONS],
        },
        {
          provide: UserService,
          useFactory: (options: AuthModuleOptions) => new UserService(options),
          inject: [AUTH_OPTIONS],
        },
        {
          provide: SessionService,
          useFactory: async (options: AuthModuleOptions) => {
            const sessions = new SessionService(options);
            if (options.syncCatalogOnBoot !== false) await sessions.syncCatalog();
            return sessions;
          },
          inject: [AUTH_OPTIONS],
        },
        {
          provide: ACCESS_TOKEN_VERIFIER,
          useFactory: (sessions: SessionService) => ({
            verify: (token: string) => sessions.verifyAccess(token),
          }),
          inject: [SessionService],
        },
      ],
      exports: [SessionService, ACCESS_TOKEN_VERIFIER],
    };
  }
}

export type { SessionDelegate };

import { MiddlewareConsumer, Module, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApiExceptionFilter, validationExceptionFactory } from '@core/backend-core';
import { AuthModule } from '@core/auth/nest';
import { PrismaModule, PrismaService } from '@core/db-prisma/nest';
import { googleSignInFromEnv } from './auth/google-sign-in.js';
import { otpSignInFromEnv } from './auth/otp-sign-in.js';
import { HealthController } from './health/health.controller.js';
import { ItemsModule } from './modules/example/items/items.module.js';
import { demoUserMiddleware } from './common/middleware/demo-user.middleware.js';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/envValidator.js';

function jwtSecret(value: string | undefined, fallback: string): string {
  if (value) return value;
  if (process.env.NODE_ENV === 'production' && !process.env.GENERATE_SPEC) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production');
  }
  return fallback;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: envValidationSchema,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule.forRootAsync({
      inject: [PrismaService, ConfigService],
      useFactory: (prisma: PrismaService, config: ConfigService) => {
        const otp = otpSignInFromEnv();
        const google = googleSignInFromEnv();
        return {
          users: prisma.user,
          refreshTokens: prisma.refreshToken,
          permissions: prisma.permission,
          roles: prisma.role,
          rolePermissions: prisma.rolePermission,
          userRoles: prisma.userRole,
          transaction: (run) =>
            prisma.$transaction((tx) =>
              run({
                users: tx.user,
                refreshTokens: tx.refreshToken,
                permissions: tx.permission,
                roles: tx.role,
                rolePermissions: tx.rolePermission,
                userRoles: tx.userRole,
              }),
            ),
          accessSecret: jwtSecret(config.get<string>('jwt.accessSecret'), 'dev-access-secret'),
          refreshSecret: jwtSecret(config.get<string>('jwt.refreshSecret'), 'dev-refresh-secret'),
          accessTtl: config.get<string>('jwt.accessExpiresIn') ?? '24h',
          refreshTtl: config.get<string>('jwt.refreshExpiresIn') ?? '7d',
          ...(otp ? { otp } : {}),
          ...(google ? { google } : {}),
          ...(process.env.GENERATE_SPEC === 'true' ? { syncCatalogOnBoot: false } : {}),
        };
      },
    }),
    ItemsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        exceptionFactory: validationExceptionFactory,
      }),
    },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    // JwtAuthGuard stays on /auth/me and the role routes. Do not register it globally: items must work without a session.
    // PERMISSION_CATALOG stays unset. Role routes read permissions from the access token.
    // OTP routes refuse until OTP_ENABLED or DEV_OTP_CODE is set. See otpSignInFromEnv.
    // The Google route refuses until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are both set.
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Items still read this example user. Auth routes ignore it and require a real session.
    consumer.apply(demoUserMiddleware).forRoutes('*');
  }
}

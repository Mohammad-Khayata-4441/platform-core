import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ApiExceptionFilter, validationExceptionFactory } from '@core/backend-core';
import { PrismaModule } from '@core/db-prisma/nest';
import { HealthController } from './health/health.controller';
import configuration from './config/configuration';
import { envValidationSchema } from './config/envValidator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      validationSchema: envValidationSchema,
      load: [configuration],
    }),
    PrismaModule,
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
    // RBAC: when you enable @core/auth's JwtAuthGuard, provide the tokens below.
    //   { provide: PERMISSION_CATALOG, useValue: myRolePermissionMap }
    //   { provide: ACCESS_TOKEN_VERIFIER, useValue: myVerifier }
  ],
})
export class AppModule {}

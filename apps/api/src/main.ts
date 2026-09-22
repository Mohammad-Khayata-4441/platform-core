import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { correlationIdMiddleware } from './common/request-context/correlation-id.middleware';
import { AppLogger } from './common/logging/app-logger';
import { buildContractDocument, writeContractArtifacts } from './contracts/contract-generation';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: process.env.NODE_ENV === 'production' ? new AppLogger({ json: true }) : undefined,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4040;
  const apiTitle = process.env.API_TITLE ?? 'Platform Core API';

  const document = buildContractDocument(app);

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: apiTitle,
    jsonDocumentUrl: 'swagger.json',
    yamlDocumentUrl: 'swagger.yaml',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      docExpansion: 'none',
      tryItOutEnabled: true,
    },
  });

  // In development: keep the committed contract live on every restart.
  if (process.env.NODE_ENV !== 'production') {
    logger.log('Generating OpenAPI spec...');
    writeContractArtifacts(document);
    logger.log('OpenAPI spec and api-contracts types regenerated');
  }

  app.use(correlationIdMiddleware);
  app.use(cookieParser.default());
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: corsOrigins?.length ? corsOrigins : true, credentials: true });
  app.set('query parser', 'extended');

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  logger.error('Error starting application', err);
  process.exit(1);
});

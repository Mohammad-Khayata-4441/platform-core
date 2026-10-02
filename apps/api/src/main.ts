import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureHttp } from './bootstrap/configure-http.js';
import { correlationIdMiddleware } from './common/request-context/correlation-id.middleware.js';
import { AppLogger } from './common/logging/app-logger.js';
import { buildContractDocument, writeContractSpec } from './contracts/contract-generation.js';

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

  // In development: keep the committed spec live on every restart.
  if (process.env.NODE_ENV !== 'production') {
    logger.log('Generating OpenAPI spec...');
    writeContractSpec(document);
    logger.log('openapi.yaml regenerated');
  }

  app.use(correlationIdMiddleware);
  configureHttp(app);
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

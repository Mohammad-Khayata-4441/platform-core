import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';

/**
 * The single seam that turns a booted Nest application into the committed API
 * contract. Both bootstrap paths — watch mode (`main.ts`) and the one-off/CI
 * generator (`scripts/generate-spec.ts`) — must call this module, so their
 * output is byte-identical.
 *
 * Paths are relative to `apps/api/` (the cwd for both callers).
 */
export const CONTRACT_SPEC_PATH = resolve(process.cwd(), 'openapi.yaml');

/**
 * The one and only Swagger document configuration. Deliberately contains no
 * `.addServer(...)`: a server block that only one bootstrap path emits is the
 * drift this module exists to prevent.
 */
export function buildContractDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(process.env.API_TITLE ?? 'Platform Core API')
    .setDescription('Platform Core API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', in: 'header' },
      'JWT-auth',
    )
    .build();

  return SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey.replace('Controller', '')}.${methodKey}`,
  });
}

/**
 * Writes the committed OpenAPI spec to `apps/api/openapi.yaml`.
 * Generating the TypeScript types from it is a separate step
 * (`pnpm --filter @core/codegen generate:types`), which uses a TypeScript 6
 * toolchain because `openapi-typescript` needs the compiler API that
 * TypeScript 7.0 does not yet ship.
 */
export function writeContractSpec(document: OpenAPIObject): void {
  writeFileSync(CONTRACT_SPEC_PATH, yaml.dump(document, { noRefs: true }));
}

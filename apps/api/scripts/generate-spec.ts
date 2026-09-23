/**
 * CI / manual equivalent of the watch-mode spec generation in main.ts.
 * Bootstraps NestJS without starting the HTTP server, then writes
 * `apps/api/openapi.yaml`. The TypeScript types are generated separately by
 * `@core/codegen` (TS 6 toolchain).
 *
 * Run via `tsx scripts/generate-spec.ts` after the API has been built.
 */
process.env.GENERATE_SPEC = 'true';

import { NestFactory } from '@nestjs/core';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import type * as ContractGen from '../src/contracts/contract-generation.js';

const appModulePath = '../dist/src/app.module.js';
const contractPath = '../dist/src/contracts/contract-generation.js';

const { AppModule } = (await import(appModulePath)) as { AppModule: typeof AppModuleType };
const { buildContractDocument, writeContractSpec } = (await import(contractPath)) as typeof ContractGen;

const app = await NestFactory.create(AppModule, { logger: false });

const document = buildContractDocument(app);
await app.close();

writeContractSpec(document);
console.log('openapi.yaml written');

/**
 * CI / manual equivalent of the watch-mode generation in main.ts.
 * Bootstraps NestJS without starting the HTTP server.
 *
 * Must run against the Nest-compiled output (`dist/`) so the `@nestjs/swagger`
 * decorator plugin is applied identically to watch mode.
 */
process.env.GENERATE_SPEC = 'true';

import { NestFactory } from '@nestjs/core';

/* eslint-disable @typescript-eslint/no-var-requires */
const { AppModule } = require('../dist/src/app.module');
const { buildContractDocument, writeContractArtifacts } = require('../dist/src/contracts/contract-generation');
/* eslint-enable @typescript-eslint/no-var-requires */

async function run() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const document = buildContractDocument(app);
  await app.close();

  writeContractArtifacts(document);
  console.log('Contract artifacts written (openapi.yaml + api-contracts types)');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

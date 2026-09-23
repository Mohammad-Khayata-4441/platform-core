import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// packages/codegen/scripts -> repo root
const here = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(here, '../../..');
const spec = resolve(repo, 'apps/api/openapi.yaml');
const out = resolve(repo, 'packages/api-contracts/types/index.ts');
const bin = resolve(here, '../node_modules/openapi-typescript/bin/cli.js');

if (!existsSync(spec)) {
  console.error(`Missing ${spec}. Run "pnpm --filter @core/api generate:spec" first.`);
  process.exit(1);
}

execSync(`node "${bin}" "${spec}" -o "${out}"`, { stdio: 'inherit' });
console.log('api-contracts/types/index.ts regenerated');

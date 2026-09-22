#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';

const HERE = fileURLToPath(new URL('.', import.meta.url));
// packages/scaffold/bin -> repo root
const TEMPLATE_ROOT = resolve(HERE, '../../..');

const SKIP = new Set(['node_modules', '.git', '.next', 'dist', '.turbo', 'generated', 'coverage']);

function copyTemplate(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) copyTemplate(from, to);
    else cpSync(from, to);
  }
}

async function resolveTarget() {
  const arg = process.argv[2] || process.env.SCAFFOLD_TARGET;
  if (arg) return resolve(process.cwd(), arg);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Target directory (my-app) ')).trim();
  rl.close();
  return resolve(process.cwd(), answer || 'my-app');
}

async function main() {
  const target = await resolveTarget();

  if (existsSync(target) && readdirSync(target).length > 0) {
    console.error(`Target "${target}" already exists and is not empty.`);
    process.exit(1);
  }

  console.log(`Copying template from ${TEMPLATE_ROOT}`);
  copyTemplate(TEMPLATE_ROOT, target);

  const { scaffold, prompt } = await import(pathToFileURL(join(target, 'scripts/scaffold.mjs')).href);
  const answers = await prompt({ defaultName: basename(target) });
  await scaffold({ root: target, ...answers, resetGit: true, install: false });

  console.log(`\nCreated ${answers.name} at ${target}`);
  console.log('Next steps:');
  console.log(`  cd ${basename(target)}`);
  console.log('  pnpm install');
  console.log('  cp apps/api/.env.example apps/api/.env');
  console.log('  cp packages/db-prisma/.env.example packages/db-prisma/.env');
  console.log(`  pnpm --filter @${answers.scope}/db-prisma db:migrate:dev`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

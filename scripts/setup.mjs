import { scaffold, prompt } from './scaffold.mjs';

const answers = await prompt({ defaultName: 'my-app' });
await scaffold({ root: process.cwd(), ...answers, resetGit: true, install: false });

console.log('\nNext steps:');
console.log('  pnpm install');
console.log('  cp apps/api/.env.example apps/api/.env');
console.log('  cp packages/db-prisma/.env.example packages/db-prisma/.env');
console.log('  pnpm --filter @core/db-prisma db:migrate:dev');

import { existsSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { execSync } from 'node:child_process';

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', '.turbo', 'generated', 'coverage']);
const TEXT_EXTS = new Set(['.ts', '.tsx', '.md', '.mdc', '.json', '.jsonc', '.mjs', '.cjs', '.css', '.js']);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(dir, entry.name));
    } else {
      yield join(dir, entry.name);
    }
  }
}

function replaceInFiles(root, from, to, filter = () => true) {
  for (const file of walk(root)) {
    if (!TEXT_EXTS.has(extname(file))) continue;
    if (!filter(file)) continue;
    const text = readFileSync(file, 'utf8');
    if (!text.includes(from)) continue;
    writeFileSync(file, text.split(from).join(to));
  }
}

function editFile(file, fn) {
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  const next = fn(text);
  if (next !== text) writeFileSync(file, next);
}

function removeLinesMatching(file, patterns) {
  editFile(file, (text) =>
    text
      .split('\n')
      .filter((line) => !patterns.some((re) => re.test(line)))
      .join('\n'),
  );
}

function pruneExampleSlice(root) {
  const rm = (p) => existsSync(p) && rmSync(p, { recursive: true, force: true });

  // API module + wiring
  rm(join(root, 'apps/api/src/modules/example'));
  removeLinesMatching(join(root, 'apps/api/src/app.module.ts'), [
    /import\s+\{\s*ItemsModule\s*\}/,
    /^\s*ItemsModule,\s*$/,
  ]);
  rm(join(root, 'apps/api/test/items.e2e-spec.ts'));

  // API client
  rm(join(root, 'packages/api-client/src/clients/items.client.ts'));
  rm(join(root, 'packages/api-client/src/clients/items.client.spec.ts'));
  writeFileSync(
    join(root, 'packages/api-client/src/clients/index.ts'),
    '// Resource clients are added by the project.\nexport {};\n',
  );

  // Contracts
  rm(join(root, 'packages/api-contracts/src/resources/items.resource.ts'));
  removeLinesMatching(join(root, 'packages/api-contracts/src/resources/index.ts'), [
    /items\.resource/,
  ]);
  rm(join(root, 'packages/api-contracts/src/dto/item.dto.ts'));
  removeLinesMatching(join(root, 'packages/api-contracts/src/dto/index.ts'), [/item\.dto/]);

  // Dashboard
  rm(join(root, 'apps/dashboard/src/modules/items'));
  rm(join(root, 'apps/dashboard/src/app/(dashboard)/items'));

  // Prisma model + migration
  editFile(join(root, 'packages/db-prisma/prisma/schema.prisma'), (text) =>
    text.replace(/\n\/\/\/ EXAMPLE[\s\S]*?\n\}\n?/, '\n'),
  );
  const migrations = join(root, 'packages/db-prisma/prisma/migrations');
  if (existsSync(migrations)) {
    for (const name of readdirSync(migrations)) {
      if (name.includes('add_item_example')) rm(join(migrations, name));
    }
  }

  // Dashboard config
  editFile(join(root, 'apps/dashboard/src/config/api.ts'), () =>
    "import { ApiClient, createApi } from '@core/api-client';\n\n" +
    'export function buildApi(baseUrl: string) {\n' +
    '  const http = new ApiClient(baseUrl);\n' +
    '  void http;\n' +
    '  return createApi({});\n' +
    '}\n\n' +
    'export type AppApi = ReturnType<typeof buildApi>;\n',
  );
  editFile(join(root, 'apps/dashboard/src/config/navigation.ts'), (text) =>
    text.replace(/export const navigation:[\s\S]*?\];/, 'export const navigation: DashboardNavItem[] = [];'),
  );
}

function pruneOptionalPackages(root, { keepUi, keepAuth }) {
  const rm = (p) => existsSync(p) && rmSync(p, { recursive: true, force: true });

  if (!keepUi) {
    rm(join(root, 'packages/ui'));
    rm(join(root, 'apps/dashboard'));
  }
  if (!keepAuth) {
    rm(join(root, 'packages/auth'));
    removeLinesMatching(join(root, 'apps/api/package.json'), [/@core\/auth/]);
    removeLinesMatching(join(root, 'apps/dashboard/package.json'), [/@core\/auth/]);
  }
}

export async function scaffold({
  root,
  name,
  scope,
  keepUi = true,
  keepAuth = true,
  resetGit = true,
  install = false,
} = {}) {
  if (!root || !name || !scope) throw new Error('scaffold requires { root, name, scope }');

  console.log(`Scaffolding "${name}" (scope @${scope}) in ${root}`);

  // 1. Remove the example slice (before renaming scope — it rewrites files with
  //    @core/ imports that the rename step below then converts).
  pruneExampleSlice(root);
  // 2. Optional packages (also strips @core/* deps before the rename).
  pruneOptionalPackages(root, { keepUi, keepAuth });
  // 3. Rename scope across the repo.
  replaceInFiles(root, '@core/', `@${scope}/`);
  // 4. Rename the root package.
  editFile(join(root, 'package.json'), (text) =>
    text.replace(/"name":\s*"platform-core"/, `"name": "${name}"`),
  );

  // 5. Reset git history.
  if (resetGit) {
    rmSync(join(root, '.git'), { recursive: true, force: true });
    execSync('git init -q', { cwd: root });
    console.log('Initialized a fresh git repository.');
  }

  // 6. Install (optional).
  if (install) {
    console.log('Installing dependencies...');
    execSync('pnpm install', { cwd: root, stdio: 'inherit' });
  }

  console.log('Scaffold complete.');
}

async function ask(question, defaultValue) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`${question} (${defaultValue}) `)).trim();
  rl.close();
  return answer || defaultValue;
}

export async function prompt({ defaultName = 'my-app' } = {}) {
  // Non-interactive mode (used by tests/CI).
  if (process.env.SCAFFOLD_NAME || process.env.SCAFFOLD_SCOPE) {
    return {
      name: process.env.SCAFFOLD_NAME || defaultName,
      scope: process.env.SCAFFOLD_SCOPE || 'core',
      keepUi: process.env.SCAFFOLD_KEEP_UI !== '0',
      keepAuth: process.env.SCAFFOLD_KEEP_AUTH !== '0',
    };
  }

  const name = await ask('Project name', defaultName);
  const scope = await ask('Package scope (without @)', 'core');
  const ui = await ask('Include the dashboard UI package? (y/n)', 'y');
  const auth = await ask('Include the auth package? (y/n)', 'y');
  return { name, scope, keepUi: ui.toLowerCase().startsWith('y'), keepAuth: auth.toLowerCase().startsWith('y') };
}

export { walk, replaceInFiles };

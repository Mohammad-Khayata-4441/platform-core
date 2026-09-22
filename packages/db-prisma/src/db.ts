import { execSync } from 'child_process';

/**
 * Checks if the database exists; if not, creates it.
 * Relies on the DATABASE_URL env var.
 */
export async function ensureDbExists() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL env variable not set');
  }

  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to ensure database exists: ${message}`);
  }
}

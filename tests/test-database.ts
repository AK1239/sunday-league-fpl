import { execSync } from "node:child_process";
import pg from "pg";
import { resetDbConnection } from "@/server/db";

const DEFAULT_TEST_DB_NAME = "fantasy_test";

/** Dev URL from .env (unchanged after vitest redirects DATABASE_URL to the test DB). */
export function readDevDatabaseUrl(): string {
  const saved = process.env.FANTASY_DEV_DATABASE_URL?.trim();
  if (saved) return saved;

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required in .env to derive the integration test database.",
    );
  }
  return url;
}

export function resolveTestDatabaseUrl(devUrl: string): string {
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  if (explicit) return explicit;

  const parsed = new URL(devUrl);
  parsed.pathname = `/${DEFAULT_TEST_DB_NAME}`;
  return parsed.toString();
}

function databaseNameFromUrl(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name) throw new Error(`Invalid database URL (no database name): ${url}`);
  return name;
}

export function isTestDatabaseUrl(url: string): boolean {
  if (process.env.FANTASY_INTEGRATION_TEST_DB !== "1") return false;
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  if (explicit) return url === explicit;
  return databaseNameFromUrl(url) === DEFAULT_TEST_DB_NAME;
}

export async function ensureTestDatabaseExists(testUrl: string): Promise<void> {
  const testDbName = databaseNameFromUrl(testUrl);
  const admin = new URL(testUrl);
  admin.pathname = "/postgres";

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const exists = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [testDbName],
    );
    if ((exists.rowCount ?? 0) === 0) {
      await client.query(`CREATE DATABASE "${testDbName.replace(/"/g, "")}"`);
    }
  } finally {
    await client.end();
  }
}

export function migrateTestDatabase(testUrl: string): void {
  execSync("pnpm db:migrate", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "inherit",
  });
}

let bootstrapPromise: Promise<string> | null = null;

/** Point Vitest integration tests at an isolated DB (never the dev database). */
export async function bootstrapTestDatabase(): Promise<string> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = doBootstrapTestDatabase();
  return bootstrapPromise;
}

async function doBootstrapTestDatabase(): Promise<string> {
  const devUrl = readDevDatabaseUrl();
  const testUrl = resolveTestDatabaseUrl(devUrl);

  if (testUrl === devUrl) {
    throw new Error(
      "TEST_DATABASE_URL must differ from DATABASE_URL so integration tests cannot wipe dev data.",
    );
  }

  await ensureTestDatabaseExists(testUrl);
  migrateTestDatabase(testUrl);

  process.env.FANTASY_DEV_DATABASE_URL = devUrl;
  process.env.DATABASE_URL = testUrl;
  process.env.FANTASY_INTEGRATION_TEST_DB = "1";
  resetDbConnection();

  return testUrl;
}

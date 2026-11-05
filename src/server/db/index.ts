import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool; drizzle?: AppDb };

function getPool(): Pool {
  globalForDb.pgPool ??= new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 10,
  });
  return globalForDb.pgPool;
}

export type AppDb = NodePgDatabase<typeof schema>;
export type DbExecutor =
  AppDb | Parameters<Parameters<AppDb["transaction"]>[0]>[0];

export function getDb(): AppDb {
  globalForDb.drizzle ??= drizzle(getPool(), { schema });
  return globalForDb.drizzle;
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await getPool().query("select 1");
    return true;
  } catch {
    return false;
  }
}

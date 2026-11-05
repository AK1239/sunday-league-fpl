import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "@/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgPool?: Pool };

function getPool(): Pool {
  globalForDb.pgPool ??= new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 10,
  });
  return globalForDb.pgPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function checkDatabase(): Promise<boolean> {
  try {
    await getPool().query("select 1");
    return true;
  } catch {
    return false;
  }
}

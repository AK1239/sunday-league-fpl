import "dotenv/config";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { parseEnv } from "@/env";

async function main() {
  const { DATABASE_URL } = parseEnv(process.env);
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: path.join(process.cwd(), "drizzle"),
    });
    console.log("Migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Optional E2E fixture: transfers mode + enabled season chips for the CI admin user.
 * Run with E2E_CHIPS=1 before chip E2E tests.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  enableChipsForSeason,
  EnableSeasonChipsError,
} from "@/server/domain/enable-season-chips";
import { seasons, users } from "@/server/db/schema";

async function main() {
  execSync("tsx scripts/e2e-prepare-transfers.ts", {
    stdio: "inherit",
    env: process.env,
  });

  const db = getDb();
  const email = (process.env.ADMIN_EMAIL ?? "ci@mkate.test").toLowerCase();

  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!admin) {
    console.error("Admin user not found — run pnpm db:seed-admin first");
    process.exit(1);
  }

  const [season] = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  if (!season) {
    console.error("No active season");
    process.exit(1);
  }

  try {
    const result = await enableChipsForSeason(db, admin.id, season.id);
    console.log(
      `E2E chips fixture ready (available from GW${result.availableFromMatchday})`,
    );
  } catch (error) {
    if (
      error instanceof EnableSeasonChipsError &&
      error.code === "ALREADY_ENABLED"
    ) {
      console.log("Season chips already enabled — skipping");
      return;
    }
    throw error;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

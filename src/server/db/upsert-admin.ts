import "dotenv/config";
import { eq } from "drizzle-orm";
import { parseEnv } from "@/env";
import { hashPassword } from "@/server/auth/password";
import { getDb } from "./index";
import { users } from "./schema";

async function main() {
  parseEnv(process.env);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  const db = getDb();
  const passwordHash = await hashPassword(password);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({ passwordHash, role: "admin", status: "active" })
      .where(eq(users.id, existing[0].id));
    console.log(`Updated admin: ${email}`);
    return;
  }

  const localPart = email.split("@")[0] ?? "Admin";
  await db.insert(users).values({
    email,
    passwordHash,
    displayName: localPart.charAt(0).toUpperCase() + localPart.slice(1),
    role: "admin",
    status: "active",
  });
  console.log(`Created admin: ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

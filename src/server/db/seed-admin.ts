import { hashPassword } from "@/server/auth/password";
import type { AppDb } from "./index";
import { adminUsers } from "./schema";

export async function seedAdminUser(db: AppDb): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(adminUsers).values({
    email,
    passwordHash: await hashPassword(password),
  });
}

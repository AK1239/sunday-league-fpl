import { hashPassword } from "@/server/auth/password";
import type { AppDb } from "./index";
import { users } from "./schema";

export async function seedAdminUser(db: AppDb): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .limit(1);
  if (existing.length > 0) return;

  const localPart = email.split("@")[0] ?? "Admin";
  await db.insert(users).values({
    email,
    passwordHash: await hashPassword(password),
    displayName: localPart.charAt(0).toUpperCase() + localPart.slice(1),
    role: "admin",
    status: "active",
  });
}

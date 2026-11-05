import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { adminUsers } from "@/server/db/schema";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "./rate-limit";
import { verifyPassword } from "./password";
import { createAdminSession } from "./session";

export type LoginResult =
  | { ok: true }
  | {
      ok: false;
      code: "RATE_LIMITED" | "INVALID_CREDENTIALS";
      retryAfterMs?: number;
    };

export async function loginWithCredentials(
  email: string,
  password: string,
  rateLimitKey: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const limit = checkLoginRateLimit(`${rateLimitKey}:${normalizedEmail}`);
  if (!limit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterMs: limit.retryAfterMs,
    };
  }

  const rows = await getDb()
    .select({
      id: adminUsers.id,
      passwordHash: adminUsers.passwordHash,
    })
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = ${normalizedEmail}`)
    .limit(1);

  const admin = rows[0];
  const valid = admin && (await verifyPassword(password, admin.passwordHash));

  if (!valid) {
    recordLoginFailure(`${rateLimitKey}:${normalizedEmail}`);
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  clearLoginFailures(`${rateLimitKey}:${normalizedEmail}`);
  await createAdminSession(admin!.id);
  return { ok: true };
}

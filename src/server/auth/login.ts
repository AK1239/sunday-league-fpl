import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { writeAuditLog } from "@/server/domain/audit-log";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordLoginFailure,
} from "./rate-limit";
import { verifyPassword } from "./password";
import { createUserSession, type UserRole } from "./session";

export type LoginResult =
  | { ok: true }
  | {
      ok: false;
      code: "RATE_LIMITED" | "INVALID_CREDENTIALS";
      retryAfterMs?: number;
    };

export type LoginOptions = {
  allowedRoles?: UserRole[];
  /** When set, a successful login is written to `audit_log`. */
  audit?: {
    ipAddress: string | null;
    userAgent: string | null;
    surface: "admin" | "manager";
  };
};

export async function loginWithCredentials(
  email: string,
  password: string,
  rateLimitKey: string,
  options: LoginOptions = {},
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
      id: users.id,
      passwordHash: users.passwordHash,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  const user = rows[0];
  const valid =
    user &&
    user.status === "active" &&
    (await verifyPassword(password, user.passwordHash));

  const allowedRoles = options.allowedRoles;
  const roleOk = !allowedRoles || (user && allowedRoles.includes(user.role));

  if (!valid || !roleOk) {
    recordLoginFailure(`${rateLimitKey}:${normalizedEmail}`);
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  clearLoginFailures(`${rateLimitKey}:${normalizedEmail}`);
  await createUserSession(user!.id);

  if (options.audit) {
    await writeAuditLog(getDb(), {
      userId: user!.id,
      action: "auth.login",
      entity: "session",
      after: {
        role: user!.role,
        surface: options.audit.surface,
        email: normalizedEmail,
      },
      ipAddress: options.audit.ipAddress,
      userAgent: options.audit.userAgent,
    });
  }

  return { ok: true };
}

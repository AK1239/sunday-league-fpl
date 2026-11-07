import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/server/db";
import { auditLog } from "@/server/db/schema";
import type { UserRole } from "@/server/auth/session";
import { writeAuditLog } from "./audit-log";

/** Minimum gap between `auth.visit` rows for the same user. */
export const AUTH_VISIT_THROTTLE_MS = 6 * 60 * 60 * 1000;

export const AUTH_VISIT_ACTION = "auth.visit";

export async function recordAuthenticatedVisit(options: {
  userId: string;
  role: UserRole;
  path: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<void> {
  const db = getDb();
  const since = new Date(Date.now() - AUTH_VISIT_THROTTLE_MS);

  const [recent] = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, options.userId),
        eq(auditLog.action, AUTH_VISIT_ACTION),
        gte(auditLog.at, since),
      ),
    )
    .limit(1);

  if (recent) return;

  await writeAuditLog(db, {
    userId: options.userId,
    action: AUTH_VISIT_ACTION,
    entity: "session",
    after: {
      path: options.path,
      role: options.role,
      resumed: true,
    },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  });
}

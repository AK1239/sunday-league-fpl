import type { DbExecutor } from "@/server/db";
import { auditLog } from "@/server/db/schema";

export async function writeAuditLog(
  db: DbExecutor,
  entry: {
    userId: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  await db.insert(auditLog).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
  });
}

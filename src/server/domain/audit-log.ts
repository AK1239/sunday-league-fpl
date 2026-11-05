import type { DbExecutor } from "@/server/db";
import { auditLog } from "@/server/db/schema";

export async function writeAuditLog(
  db: DbExecutor,
  entry: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await db.insert(auditLog).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}

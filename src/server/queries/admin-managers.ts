import { desc, eq } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { users } from "@/server/db/schema";

export type AdminManagerRow = {
  id: string;
  email: string;
  displayName: string;
  teamName: string | null;
  status: "active" | "disabled";
  createdAt: Date;
};

export async function listManagersForAdmin(
  db: AppDb,
): Promise<AdminManagerRow[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      teamName: users.teamName,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "manager"))
    .orderBy(desc(users.createdAt));
}

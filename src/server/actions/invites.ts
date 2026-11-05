"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import {
  acceptManagerInvite,
  createManagerInvite,
} from "@/server/domain/invites";
import { getDb } from "@/server/db";
import { managerInvites, players, users } from "@/server/db/schema";
import { actionFail, actionOk, type ActionResult } from "./action-result";

export type InviteListItem = {
  id: string;
  label: string | null;
  linkedPlayerName: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  isPasswordReset: boolean;
  resetUserEmail: string | null;
};

export async function listManagerInvites(): Promise<InviteListItem[]> {
  await requireAdmin();
  const rows = await getDb()
    .select({
      id: managerInvites.id,
      label: managerInvites.label,
      expiresAt: managerInvites.expiresAt,
      usedAt: managerInvites.usedAt,
      resetUserId: managerInvites.resetUserId,
      linkedPlayerName: players.displayName,
      resetUserEmail: users.email,
    })
    .from(managerInvites)
    .leftJoin(players, eq(managerInvites.linkedPlayerId, players.id))
    .leftJoin(users, eq(managerInvites.resetUserId, users.id))
    .orderBy(desc(managerInvites.expiresAt));

  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    linkedPlayerName: row.linkedPlayerName,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt,
    isPasswordReset: Boolean(row.resetUserId),
    resetUserEmail: row.resetUserEmail,
  }));
}

export async function createManagerInviteAction(
  formData: FormData,
): Promise<ActionResult<{ joinPath: string }>> {
  const session = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const linkedPlayerId = String(formData.get("linkedPlayerId") ?? "").trim();
  const resetUserId = String(formData.get("resetUserId") ?? "").trim();

  if (resetUserId) {
    const target = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, resetUserId))
      .limit(1);
    if (!target[0]) {
      return actionFail("VALIDATION", "User not found for password reset.");
    }
  }

  const created = await createManagerInvite({
    label: label || undefined,
    linkedPlayerId: linkedPlayerId || null,
    resetUserId: resetUserId || null,
    createdByUserId: session.userId,
  });

  revalidatePath("/admin/invites");
  return actionOk({
    joinPath: `/join/${created.token}`,
  });
}

export async function acceptInviteAction(
  formData: FormData,
): Promise<ActionResult<{ userId: string }>> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await acceptManagerInvite({
    token,
    email,
    displayName,
    password,
  });

  if (!result.ok) {
    return actionFail("VALIDATION", result.message);
  }

  return actionOk({ userId: result.userId });
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import {
  auditLog,
  fantasyTransfers,
  managerChipPlays,
  managerFreeTransferAdjustments,
  managerInvites,
  seasonAwards,
  users,
} from "@/server/db/schema";
import { actionFail, actionOk, type ActionResult } from "./action-result";

export async function setManagerStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const id = String(formData.get("userId") ?? "").trim();
  const next = String(formData.get("status") ?? "").trim();

  if (!id || (next !== "active" && next !== "disabled")) {
    return actionFail("VALIDATION", "Invalid request.");
  }

  if (id === session.userId) {
    return actionFail("VALIDATION", "You cannot change your own account here.");
  }

  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) {
    return actionFail("VALIDATION", "User not found.");
  }

  await getDb().update(users).set({ status: next }).where(eq(users.id, id));

  revalidatePath("/admin/users");
  return actionOk();
}

export async function deleteManagerUserAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const id = String(formData.get("userId") ?? "").trim();

  if (!id) {
    return actionFail("VALIDATION", "Invalid request.");
  }

  if (id === session.userId) {
    return actionFail("VALIDATION", "You cannot delete your own account.");
  }

  const [target] = await getDb()
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!target) {
    return actionFail("VALIDATION", "User not found.");
  }

  if (target.role !== "manager") {
    return actionFail(
      "VALIDATION",
      "Only manager accounts can be removed here.",
    );
  }

  const db = getDb();
  const adminId = session.userId;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(managerInvites)
        .set({ usedByUserId: null })
        .where(eq(managerInvites.usedByUserId, id));
      await tx
        .update(managerInvites)
        .set({ resetUserId: null })
        .where(eq(managerInvites.resetUserId, id));
      await tx
        .update(managerInvites)
        .set({ createdByUserId: adminId })
        .where(eq(managerInvites.createdByUserId, id));
      await tx
        .update(fantasyTransfers)
        .set({ voidedBy: null })
        .where(eq(fantasyTransfers.voidedBy, id));
      await tx
        .update(managerChipPlays)
        .set({ voidedBy: null })
        .where(eq(managerChipPlays.voidedBy, id));
      await tx.delete(seasonAwards).where(eq(seasonAwards.managerId, id));
      await tx
        .update(auditLog)
        .set({ userId: null })
        .where(eq(auditLog.userId, id));
      await tx
        .update(managerFreeTransferAdjustments)
        .set({ createdBy: adminId })
        .where(eq(managerFreeTransferAdjustments.createdBy, id));

      await tx.delete(users).where(eq(users.id, id));
    });
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Could not delete user (database constraint).";
    return actionFail("VALIDATION", message);
  }

  revalidatePath("/admin/users");
  return actionOk();
}

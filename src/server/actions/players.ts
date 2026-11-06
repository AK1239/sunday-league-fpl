"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/server/db";
import {
  createPlayerAdmin,
  setPlayerActiveAdmin,
  setPlayerAvatarUrl,
  updatePlayerAdmin,
} from "@/server/domain/players-admin";
import { savePlayerAvatar } from "@/server/lib/avatar";
import { requireAdmin } from "@/server/auth/require-admin";
import { isKitKey } from "@/lib/kits";
import { actionFail, actionOk, type ActionResult } from "./action-result";

const playerSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(80),
  nickname: z.string().trim().max(40).optional(),
  joinedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  kitKey: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((s) => (s == null || s === "" ? null : s))
    .refine((s) => s == null || isKitKey(s), "Invalid shirt kit."),
});

export async function createPlayerAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = playerSchema.safeParse({
    displayName: formData.get("displayName"),
    nickname: formData.get("nickname") || undefined,
    joinedOn: formData.get("joinedOn") || undefined,
    kitKey: formData.get("kitKey") || undefined,
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Check the form fields.", {
      displayName: parsed.error.flatten().fieldErrors.displayName?.[0] ?? "",
    });
  }

  try {
    const player = await createPlayerAdmin(getDb(), {
      displayName: parsed.data.displayName,
      nickname: parsed.data.nickname,
      joinedOn: parsed.data.joinedOn || null,
      kitKey: parsed.data.kitKey,
    });

    const avatar = formData.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      try {
        const url = await savePlayerAvatar(player.id, avatar);
        await setPlayerAvatarUrl(getDb(), player.id, url);
      } catch (error) {
        const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
        return actionFail(code, "Could not upload avatar.");
      }
    }

    revalidatePath("/admin/players");
    revalidatePath("/players");
    return actionOk({ id: player.id });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_NAME") {
      return actionFail(
        "DUPLICATE_NAME",
        "A player with this name already exists.",
        {
          displayName: "Already registered",
        },
      );
    }
    throw error;
  }
}

export async function updatePlayerAction(
  playerId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = playerSchema.safeParse({
    displayName: formData.get("displayName"),
    kitKey: formData.get("kitKey") || undefined,
  });

  if (!parsed.success) {
    return actionFail("VALIDATION", "Check the form fields.");
  }

  try {
    await updatePlayerAdmin(getDb(), playerId, {
      displayName: parsed.data.displayName,
      kitKey: parsed.data.kitKey,
    });

    const avatar = formData.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      const url = await savePlayerAvatar(playerId, avatar);
      await setPlayerAvatarUrl(getDb(), playerId, url);
    }

    revalidatePath("/admin/players");
    revalidatePath("/players");
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_NAME") {
      return actionFail(
        "DUPLICATE_NAME",
        "A player with this name already exists.",
      );
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return actionFail("NOT_FOUND", "Player not found.");
    }
    throw error;
  }
}

export async function deactivatePlayerAction(
  playerId: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await setPlayerActiveAdmin(getDb(), playerId, false);
    revalidatePath("/admin/players");
    revalidatePath("/players");
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return actionFail("NOT_FOUND", "Player not found.");
    }
    throw error;
  }
}

export async function reactivatePlayerAction(
  playerId: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await setPlayerActiveAdmin(getDb(), playerId, true);
    revalidatePath("/admin/players");
    revalidatePath("/players");
    return actionOk();
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return actionFail("NOT_FOUND", "Player not found.");
    }
    throw error;
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { setTeamName, TeamNameError } from "@/server/domain/team-name";
import { actionFail, actionOk, type ActionResult } from "./action-result";

export async function setTeamNameAction(
  name: string,
): Promise<ActionResult<{ teamName: string }>> {
  const session = await requireUser();
  try {
    const teamName = await setTeamName(getDb(), session.userId, String(name));
    for (const path of ["/", "/table", "/my", "/pick"]) revalidatePath(path);
    revalidatePath("/managers/[managerId]", "page");
    return actionOk({ teamName });
  } catch (error) {
    if (error instanceof TeamNameError) {
      return actionFail(error.code, error.message);
    }
    return actionFail("ERROR", "Could not save your team name.");
  }
}

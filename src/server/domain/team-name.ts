import { eq } from "drizzle-orm";
import type { DbExecutor } from "@/server/db";
import { users } from "@/server/db/schema";
import { normalizeTeamName } from "@/lib/team-name";

export class TeamNameError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID" | "TAKEN",
  ) {
    super(message);
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (
      typeof current === "object" &&
      current !== null &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function getTeamName(
  db: DbExecutor,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ teamName: users.teamName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.teamName ?? null;
}

/** Sets the manager's team name. Names are unique (case-insensitive). */
export async function setTeamName(
  db: DbExecutor,
  userId: string,
  raw: string,
): Promise<string> {
  const parsed = normalizeTeamName(raw);
  if (!parsed.ok) throw new TeamNameError(parsed.message, "INVALID");
  try {
    await db
      .update(users)
      .set({ teamName: parsed.value })
      .where(eq(users.id, userId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new TeamNameError("That team name is already taken.", "TAKEN");
    }
    throw error;
  }
  return parsed.value;
}

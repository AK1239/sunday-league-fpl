import { and, eq, ne, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { players } from "@/server/db/schema";

export async function listPlayersAdmin(db: AppDb) {
  return db
    .select()
    .from(players)
    .orderBy(sql`lower(${players.displayName})`);
}

export async function createPlayerAdmin(
  db: AppDb,
  input: {
    displayName: string;
    nickname?: string | null;
    joinedOn?: string | null;
  },
) {
  const displayName = input.displayName.trim();
  const duplicate = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(sql`lower(${players.displayName})`, displayName.toLowerCase()))
    .limit(1);

  if (duplicate[0]) {
    throw new Error("DUPLICATE_NAME");
  }

  const [row] = await db
    .insert(players)
    .values({
      displayName,
      nickname: input.nickname?.trim() || null,
      joinedOn: input.joinedOn ?? null,
      active: true,
    })
    .returning();

  return row!;
}

export async function updatePlayerAdmin(
  db: AppDb,
  playerId: string,
  input: {
    displayName: string;
    nickname?: string | null;
    joinedOn?: string | null;
  },
) {
  const displayName = input.displayName.trim();
  const duplicate = await db
    .select({ id: players.id })
    .from(players)
    .where(
      and(
        eq(sql`lower(${players.displayName})`, displayName.toLowerCase()),
        ne(players.id, playerId),
      ),
    )
    .limit(1);

  if (duplicate[0]) {
    throw new Error("DUPLICATE_NAME");
  }

  const [row] = await db
    .update(players)
    .set({
      displayName,
      nickname: input.nickname?.trim() || null,
      joinedOn: input.joinedOn ?? null,
    })
    .where(eq(players.id, playerId))
    .returning();

  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function setPlayerActiveAdmin(
  db: AppDb,
  playerId: string,
  active: boolean,
) {
  const [row] = await db
    .update(players)
    .set({ active })
    .where(eq(players.id, playerId))
    .returning();

  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function setPlayerAvatarUrl(
  db: AppDb,
  playerId: string,
  avatarUrl: string,
) {
  const [row] = await db
    .update(players)
    .set({ avatarUrl })
    .where(eq(players.id, playerId))
    .returning();

  if (!row) throw new Error("NOT_FOUND");
  return row;
}

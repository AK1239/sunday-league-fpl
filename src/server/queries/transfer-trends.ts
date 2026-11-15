import { and, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { fantasyTransfers, players } from "@/server/db/schema";
import { MIN_TEAMS_FOR_SELECTED_BY } from "./gameweek-pick-stats";

export type TransferTrendPlayer = {
  playerId: string;
  displayName: string;
  kitKey: string | null;
  avatarUrl: string | null;
  count: number;
};

export type PublicTransferTrends = {
  matchdayId: string;
  number: number;
  totalTransfers: number;
  managers: number;
  mostIn: TransferTrendPlayer[];
  mostOut: TransferTrendPlayer[];
};

const TOP_N = 5;

/**
 * Most transferred in / out for one gameweek (active transfers only).
 * Hidden until at least MIN_TEAMS_FOR_SELECTED_BY transfers exist so a single
 * manager's move is never identifiable.
 */
export async function getPublicTransferTrends(
  db: AppDb,
  matchday: { id: string; number: number },
): Promise<PublicTransferTrends | null> {
  const rows = await db
    .select({
      managerId: fantasyTransfers.managerId,
      playerOutId: fantasyTransfers.playerOutId,
      playerInId: fantasyTransfers.playerInId,
    })
    .from(fantasyTransfers)
    .where(
      and(
        eq(fantasyTransfers.matchdayId, matchday.id),
        eq(fantasyTransfers.status, "active"),
      ),
    );

  if (rows.length < MIN_TEAMS_FOR_SELECTED_BY) return null;

  const ins = new Map<string, number>();
  const outs = new Map<string, number>();
  for (const r of rows) {
    ins.set(r.playerInId, (ins.get(r.playerInId) ?? 0) + 1);
    outs.set(r.playerOutId, (outs.get(r.playerOutId) ?? 0) + 1);
  }

  const ids = [...new Set([...ins.keys(), ...outs.keys()])];
  const meta = new Map(
    (
      await db
        .select({
          id: players.id,
          displayName: players.displayName,
          kitKey: players.kitKey,
          avatarUrl: players.avatarUrl,
        })
        .from(players)
        .where(inArray(players.id, ids))
    ).map((p) => [p.id, p]),
  );

  const top = (m: Map<string, number>): TransferTrendPlayer[] =>
    [...m.entries()]
      .map(([playerId, count]) => ({
        playerId,
        count,
        displayName: meta.get(playerId)?.displayName ?? "Unknown",
        kitKey: meta.get(playerId)?.kitKey ?? null,
        avatarUrl: meta.get(playerId)?.avatarUrl ?? null,
      }))
      .sort(
        (a, b) =>
          b.count - a.count || a.displayName.localeCompare(b.displayName),
      )
      .slice(0, TOP_N);

  return {
    matchdayId: matchday.id,
    number: matchday.number,
    totalTransfers: rows.length,
    managers: new Set(rows.map((r) => r.managerId)).size,
    mostIn: top(ins),
    mostOut: top(outs),
  };
}

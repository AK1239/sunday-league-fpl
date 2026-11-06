import { and, eq, sql } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  matchdays,
  players,
} from "@/server/db/schema";
import { isSelectionOpen } from "@/server/fantasy/lock";
import {
  validateFantasyTeam,
  type FantasyTeamPick,
} from "@/server/fantasy/validate-team";
import { writeAuditLog } from "./audit-log";
import { recomputeMatchday } from "./recompute-matchday";

export class FantasyTeamError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "FantasyTeamError";
  }
}

export type SaveFantasyTeamOptions =
  | { mode: "manager"; managerId: string }
  | {
      mode: "admin_override";
      adminUserId: string;
      targetManagerId: string;
      reason: string;
    };

async function loadEligiblePlayers(db: AppDb) {
  const rows = await db
    .select({
      id: players.id,
      active: players.active,
    })
    .from(players)
    .where(eq(players.active, true));

  return new Map(rows.map((row) => [row.id, row]));
}

async function readDbNow(tx: DbExecutor): Promise<Date> {
  const result = await tx.execute<{ now: Date }>(sql`select now() as now`);
  const row = result.rows[0];
  if (!row?.now) {
    throw new FantasyTeamError("Could not read server time.", "DB_TIME");
  }
  return row.now instanceof Date ? row.now : new Date(String(row.now));
}

export async function saveFantasyTeam(
  db: AppDb,
  matchdayId: string,
  pick: FantasyTeamPick,
  options: SaveFantasyTeamOptions,
): Promise<{ teamId: string }> {
  const managerId =
    options.mode === "manager" ? options.managerId : options.targetManagerId;

  if (options.mode === "admin_override") {
    const reason = options.reason.trim();
    if (reason.length < 3) {
      throw new FantasyTeamError(
        "Provide a short reason for the override (at least 3 characters).",
        "REASON_REQUIRED",
      );
    }
  }

  const eligibleById = await loadEligiblePlayers(db);
  const validation = validateFantasyTeam(pick, eligibleById);
  if (!validation.ok) {
    throw new FantasyTeamError(validation.message, validation.code);
  }

  let matchdayStatus: string = "scheduled";
  let teamId = "";

  await db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: matchdays.id,
        status: matchdays.status,
        deadlineAt: matchdays.deadlineAt,
      })
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId))
      .for("update")
      .limit(1);

    const matchday = locked[0];
    if (!matchday) {
      throw new FantasyTeamError("Matchday not found.", "NOT_FOUND");
    }
    matchdayStatus = matchday.status;

    if (matchday.status === "cancelled") {
      throw new FantasyTeamError(
        "This gameweek was cancelled.",
        "CANCELLED",
      );
    }

    const dbNow = await readDbNow(tx);

    if (options.mode === "manager") {
      if (
        !isSelectionOpen(
          { status: matchday.status, deadlineAt: matchday.deadlineAt },
          dbNow,
        )
      ) {
        throw new FantasyTeamError(
          "Selection is closed for this gameweek.",
          "LOCKED",
        );
      }
    }

    const existing = await tx
      .select({
        id: fantasyTeams.id,
        version: fantasyTeams.version,
        source: fantasyTeams.source,
        captainPlayerId: fantasyTeams.captainPlayerId,
        viceCaptainPlayerId: fantasyTeams.viceCaptainPlayerId,
        squadKind: fantasyTeams.squadKind,
        reservePlayerId: fantasyTeams.reservePlayerId,
      })
      .from(fantasyTeams)
      .where(
        and(
          eq(fantasyTeams.managerId, managerId),
          eq(fantasyTeams.matchdayId, matchdayId),
        ),
      )
      .limit(1);

    const beforeTeam = existing[0] ?? null;
    const nextVersion = (beforeTeam?.version ?? 0) + 1;
    const source = options.mode === "manager" ? "manual" : "admin";

    if (beforeTeam) {
      await tx.delete(fantasyTeams).where(eq(fantasyTeams.id, beforeTeam.id));
    }

    const preservedSquadKind =
      options.mode === "admin_override" && beforeTeam
        ? beforeTeam.squadKind
        : "permanent";
    const preservedReserve =
      options.mode === "admin_override" && beforeTeam
        ? beforeTeam.reservePlayerId
        : null;

    const [created] = await tx
      .insert(fantasyTeams)
      .values({
        managerId,
        matchdayId,
        captainPlayerId: pick.captainPlayerId,
        viceCaptainPlayerId: pick.viceCaptainPlayerId,
        source,
        squadKind: preservedSquadKind,
        reservePlayerId: preservedReserve,
        version: nextVersion,
        submittedAt: dbNow,
        updatedAt: dbNow,
      })
      .returning({ id: fantasyTeams.id });

    teamId = created!.id;

    await tx.insert(fantasyTeamPlayers).values(
      pick.playerIds.map((playerId) => ({
        fantasyTeamId: teamId,
        playerId,
      })),
    );

    if (options.mode === "admin_override") {
      await writeAuditLog(tx, {
        userId: options.adminUserId,
        action: "override_fantasy_team",
        entity: "fantasy_team",
        entityId: teamId,
        before: beforeTeam
          ? {
              source: beforeTeam.source,
              captainPlayerId: beforeTeam.captainPlayerId,
              viceCaptainPlayerId: beforeTeam.viceCaptainPlayerId,
            }
          : null,
        after: {
          managerId,
          matchdayId,
          reason: options.reason.trim(),
          captainPlayerId: pick.captainPlayerId,
          viceCaptainPlayerId: pick.viceCaptainPlayerId,
          playerIds: pick.playerIds,
          source,
        },
      });
    }
  });

  if (options.mode === "admin_override" && matchdayStatus === "published") {
    await recomputeMatchday(matchdayId);
  }

  return { teamId };
}

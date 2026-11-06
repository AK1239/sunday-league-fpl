import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { AppDb, DbExecutor } from "@/server/db";
import {
  fantasyTeamPlayers,
  fantasyTeams,
  fantasyTransfers,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";
import { isSelectionOpen } from "@/server/fantasy/lock";
import {
  hasPriorSubmittedSquadInSeason,
  resolveBaseSquadPlayerIds,
} from "@/server/fantasy/transfer-base-squad";
import { diffSquads, pairTransferSlots } from "@/server/fantasy/transfer-diff";
import {
  isTransferModeEnabled,
  seasonTransferRulesFromRow,
  transferRulesApplyToMatchday,
} from "@/server/fantasy/transfer-rules";
import {
  isPenaltyAcknowledged,
  summariseTransferWindow,
  type TransferWindowSummary,
} from "@/server/fantasy/transfer-summary";
import {
  validateFantasyTeamTransferPick,
  validateInitialFantasyTeamBuild,
} from "@/server/fantasy/validate-transfers";
import type { FantasyTeamPick } from "@/server/fantasy/validate-team";
import {
  getNextScheduledMatchday,
  loadSubmittedTeamsForSeason,
} from "@/server/queries/fantasy-team-view";
import { FantasyTeamError, saveFantasyTeam } from "./save-fantasy-team";
import { computeFreeAvailableForMatchday } from "./transfer-balance";

export type SubmitTeamRequest = FantasyTeamPick & {
  expectedVersion: number;
  acknowledgedPenalty: number;
};

export type SubmitTeamResult = {
  teamId: string;
  version: number;
  summary: TransferWindowSummary | null;
};

function advisoryLockKeys(managerId: string, seasonId: string): [number, number] {
  const digest = createHash("sha256")
    .update(`${managerId}:${seasonId}`)
    .digest();
  return [digest.readInt32BE(0), digest.readInt32BE(4)];
}

async function readDbNow(tx: DbExecutor): Promise<Date> {
  const result = await tx.execute<{ now: Date }>(sql`select now() as now`);
  const row = result.rows[0];
  if (!row?.now) {
    throw new FantasyTeamError("Could not read server time.", "DB_TIME");
  }
  return row.now instanceof Date ? row.now : new Date(String(row.now));
}

async function loadEligiblePlayersMap(tx: DbExecutor) {
  const rows = await tx
    .select({ id: players.id, active: players.active })
    .from(players);
  return new Map(rows.map((row) => [row.id, row]));
}

function pickEquals(a: FantasyTeamPick, b: FantasyTeamPick): boolean {
  if (a.captainPlayerId !== b.captainPlayerId) return false;
  if (a.viceCaptainPlayerId !== b.viceCaptainPlayerId) return false;
  const setA = new Set(a.playerIds);
  if (setA.size !== 5) return false;
  return b.playerIds.every((id) => setA.has(id));
}

async function loadExistingTeamPlayers(
  tx: DbExecutor,
  teamId: string,
): Promise<string[]> {
  const rows = await tx
    .select({ playerId: fantasyTeamPlayers.playerId })
    .from(fantasyTeamPlayers)
    .where(eq(fantasyTeamPlayers.fantasyTeamId, teamId));
  return rows.map((r) => r.playerId);
}

async function persistSquadInPlace(
  tx: DbExecutor,
  options: {
    teamId: string;
    pick: FantasyTeamPick;
    nextVersion: number;
    dbNow: Date;
    source: "manual" | "admin";
  },
) {
  await tx
    .update(fantasyTeams)
    .set({
      captainPlayerId: options.pick.captainPlayerId,
      viceCaptainPlayerId: options.pick.viceCaptainPlayerId,
      version: options.nextVersion,
      updatedAt: options.dbNow,
      source: options.source,
    })
    .where(eq(fantasyTeams.id, options.teamId));

  await tx
    .delete(fantasyTeamPlayers)
    .where(eq(fantasyTeamPlayers.fantasyTeamId, options.teamId));

  await tx.insert(fantasyTeamPlayers).values(
    options.pick.playerIds.map((playerId) => ({
      fantasyTeamId: options.teamId,
      playerId,
    })),
  );
}

async function syncTransferMaterialisation(
  tx: DbExecutor,
  input: {
    seasonId: string;
    managerId: string;
    matchdayId: string;
    basePlayerIds: readonly string[];
    pick: FantasyTeamPick;
    freeAvailable: number;
    penaltyPerExtra: number;
    summary: TransferWindowSummary;
  },
) {
  await tx
    .delete(fantasyTransfers)
    .where(
      and(
        eq(fantasyTransfers.managerId, input.managerId),
        eq(fantasyTransfers.matchdayId, input.matchdayId),
        eq(fantasyTransfers.status, "active"),
      ),
    );

  const diff = diffSquads(input.basePlayerIds, input.pick.playerIds);
  const pairs = pairTransferSlots(diff);

  if (pairs.length > 0) {
    await tx.insert(fantasyTransfers).values(
      pairs.map((pair, index) => ({
        seasonId: input.seasonId,
        managerId: input.managerId,
        matchdayId: input.matchdayId,
        seq: index + 1,
        playerOutId: pair.playerOutId,
        playerInId: pair.playerInId,
        source: "manager" as const,
      })),
    );
  }

  const dbNow = await readDbNow(tx);
  await tx
    .insert(managerTransferWindows)
    .values({
      managerId: input.managerId,
      matchdayId: input.matchdayId,
      seasonId: input.seasonId,
      freeAvailable: input.freeAvailable,
      unlimited: false,
      penaltyPerExtra: input.penaltyPerExtra,
      updatedAt: dbNow,
    })
    .onConflictDoUpdate({
      target: [
        managerTransferWindows.managerId,
        managerTransferWindows.matchdayId,
      ],
      set: {
        freeAvailable: input.freeAvailable,
        penaltyPerExtra: input.penaltyPerExtra,
        updatedAt: dbNow,
        voidedAt: null,
      },
    });
}

export async function submitTeam(
  db: AppDb,
  matchdayId: string,
  request: SubmitTeamRequest,
  managerId: string,
): Promise<SubmitTeamResult> {
  const context = await db
    .select({
      matchdayId: matchdays.id,
      matchdayNumber: matchdays.number,
      playedOn: matchdays.playedOn,
      deadlineAt: matchdays.deadlineAt,
      status: matchdays.status,
      seasonId: matchdays.seasonId,
      seasonStartsOn: seasons.startsOn,
      transfersStartMatchday: scoringRuleSets.transfersStartMatchday,
      freeTransfersPerMatchday: scoringRuleSets.freeTransfersPerMatchday,
      maxBankedFreeTransfers: scoringRuleSets.maxBankedFreeTransfers,
      extraTransferPenalty: scoringRuleSets.extraTransferPenalty,
    })
    .from(matchdays)
    .innerJoin(seasons, eq(matchdays.seasonId, seasons.id))
    .innerJoin(scoringRuleSets, eq(seasons.ruleSetId, scoringRuleSets.id))
    .where(eq(matchdays.id, matchdayId))
    .limit(1);

  const row = context[0];
  if (!row) {
    throw new FantasyTeamError("Matchday not found.", "NOT_FOUND");
  }

  const transferRules = seasonTransferRulesFromRow(row);
  const transferMode =
    isTransferModeEnabled(transferRules.transfersStartMatchday) &&
    transferRulesApplyToMatchday(transferRules, row.matchdayNumber);

  if (!transferMode) {
    const { teamId } = await saveFantasyTeam(db, matchdayId, request, {
      mode: "manager",
      managerId,
    });
    const [saved] = await db
      .select({ version: fantasyTeams.version })
      .from(fantasyTeams)
      .where(eq(fantasyTeams.id, teamId))
      .limit(1);
    return {
      teamId,
      version: saved?.version ?? 1,
      summary: null,
    };
  }

  let result: SubmitTeamResult = { teamId: "", version: 0, summary: null };

  await db.transaction(async (tx) => {
    const [manager] = await tx
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, managerId))
      .limit(1);

    if (!manager || manager.status !== "active") {
      throw new FantasyTeamError(
        "Your account cannot submit teams.",
        "MANAGER_DISABLED",
      );
    }

    const [lockKey1, lockKey2] = advisoryLockKeys(managerId, row.seasonId);
    await tx.execute(
      sql`select pg_advisory_xact_lock(${lockKey1}, ${lockKey2})`,
    );

    const locked = await tx
      .select({
        id: matchdays.id,
        status: matchdays.status,
        deadlineAt: matchdays.deadlineAt,
        number: matchdays.number,
        playedOn: matchdays.playedOn,
        seasonId: matchdays.seasonId,
      })
      .from(matchdays)
      .where(eq(matchdays.id, matchdayId))
      .for("update")
      .limit(1);

    const matchday = locked[0];
    if (!matchday) {
      throw new FantasyTeamError("Matchday not found.", "NOT_FOUND");
    }

    if (matchday.status === "cancelled") {
      throw new FantasyTeamError(
        "This gameweek was cancelled.",
        "CANCELLED",
      );
    }

    const dbNow = await readDbNow(tx);

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

    const nextOpen = await getNextScheduledMatchday(tx, row.seasonId);
    if (!nextOpen || nextOpen.id !== matchdayId) {
      throw new FantasyTeamError(
        "You can only change the team for the next open gameweek.",
        "NOT_NEXT_MATCHDAY",
      );
    }

    const submittedTeams = await loadSubmittedTeamsForSeason(tx, row.seasonId);
    const targetTimeline = {
      matchdayId,
      playedOn: matchday.playedOn,
      number: matchday.number,
      seasonStartsOn: row.seasonStartsOn,
    };

    const existing = await tx
      .select({
        id: fantasyTeams.id,
        version: fantasyTeams.version,
        captainPlayerId: fantasyTeams.captainPlayerId,
        viceCaptainPlayerId: fantasyTeams.viceCaptainPlayerId,
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

    if (beforeTeam) {
      const currentPlayers = await loadExistingTeamPlayers(tx, beforeTeam.id);
      const currentPick: FantasyTeamPick = {
        playerIds: currentPlayers,
        captainPlayerId: beforeTeam.captainPlayerId,
        viceCaptainPlayerId: beforeTeam.viceCaptainPlayerId,
      };
      if (pickEquals(currentPick, request)) {
        result = {
          teamId: beforeTeam.id,
          version: beforeTeam.version,
          summary: null,
        };
        return;
      }
      if (request.expectedVersion !== beforeTeam.version) {
        throw new FantasyTeamError(
          "This team was updated elsewhere. Reload and try again.",
          "CONFLICT",
        );
      }
    }

    const eligibleById = await loadEligiblePlayersMap(tx);
    const basePlayerIds = resolveBaseSquadPlayerIds(
      managerId,
      targetTimeline,
      submittedTeams,
    );

    const isInitialBuild =
      !hasPriorSubmittedSquadInSeason(
        managerId,
        targetTimeline,
        submittedTeams,
      ) && basePlayerIds == null;

    if (isInitialBuild) {
      const validation = validateInitialFantasyTeamBuild(request, eligibleById);
      if (!validation.ok) {
        throw new FantasyTeamError(validation.message, validation.code);
      }

      const nextVersion = (beforeTeam?.version ?? 0) + 1;
      let teamId = beforeTeam?.id ?? "";

      if (beforeTeam) {
        await persistSquadInPlace(tx, {
          teamId: beforeTeam.id,
          pick: request,
          nextVersion,
          dbNow,
          source: "manual",
        });
        teamId = beforeTeam.id;
      } else {
        const [created] = await tx
          .insert(fantasyTeams)
          .values({
            managerId,
            matchdayId,
            captainPlayerId: request.captainPlayerId,
            viceCaptainPlayerId: request.viceCaptainPlayerId,
            source: "manual",
            version: nextVersion,
            submittedAt: dbNow,
            updatedAt: dbNow,
          })
          .returning({ id: fantasyTeams.id });
        teamId = created!.id;
        await tx.insert(fantasyTeamPlayers).values(
          request.playerIds.map((playerId) => ({
            fantasyTeamId: teamId,
            playerId,
          })),
        );
      }

      result = { teamId, version: nextVersion, summary: null };
      return;
    }

    if (!basePlayerIds || basePlayerIds.length !== 5) {
      throw new FantasyTeamError(
        "Base squad is incomplete.",
        "VALIDATION",
      );
    }

    const validation = validateFantasyTeamTransferPick(
      request,
      basePlayerIds,
      eligibleById,
    );
    if (!validation.ok) {
      throw new FantasyTeamError(validation.message, validation.code);
    }

    const freeRules = {
      grant: transferRules.grant,
      cap: transferRules.cap,
      penaltyPerExtra: transferRules.penaltyPerExtra,
    };

    const freeAvailable = await computeFreeAvailableForMatchday(tx, {
      managerId,
      seasonId: row.seasonId,
      matchdayId,
      matchdayNumber: matchday.number,
      transfersStartMatchday: transferRules.transfersStartMatchday!,
      rules: freeRules,
    });

    const summary = summariseTransferWindow({
      baseSquad: basePlayerIds,
      nextSquad: request.playerIds,
      freeAvailable,
      penaltyPerExtra: transferRules.penaltyPerExtra,
    });

    if (!isPenaltyAcknowledged(summary, request.acknowledgedPenalty)) {
      throw new FantasyTeamError(
        "Confirm the transfer penalty before submitting.",
        "PENALTY_NOT_CONFIRMED",
        {
          made: summary.made,
          freeAvailable: summary.freeAvailable,
          extra: summary.extra,
          penalty: -summary.transferPenalty,
        },
      );
    }

    const nextVersion = (beforeTeam?.version ?? 0) + 1;
    let teamId = beforeTeam?.id ?? "";

    if (beforeTeam) {
      await persistSquadInPlace(tx, {
        teamId: beforeTeam.id,
        pick: request,
        nextVersion,
        dbNow,
        source: "manual",
      });
      teamId = beforeTeam.id;
    } else {
      const [created] = await tx
        .insert(fantasyTeams)
        .values({
          managerId,
          matchdayId,
          captainPlayerId: request.captainPlayerId,
          viceCaptainPlayerId: request.viceCaptainPlayerId,
          source: "manual",
          version: nextVersion,
          submittedAt: dbNow,
          updatedAt: dbNow,
        })
        .returning({ id: fantasyTeams.id });
      teamId = created!.id;
      await tx.insert(fantasyTeamPlayers).values(
        request.playerIds.map((playerId) => ({
          fantasyTeamId: teamId,
          playerId,
        })),
      );
    }

    await syncTransferMaterialisation(tx, {
      seasonId: row.seasonId,
      managerId,
      matchdayId,
      basePlayerIds,
      pick: request,
      freeAvailable,
      penaltyPerExtra: transferRules.penaltyPerExtra,
      summary,
    });

    result = { teamId, version: nextVersion, summary };
  });

  return result;
}

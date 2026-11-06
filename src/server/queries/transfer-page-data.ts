import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  fantasyTeams,
  fantasyTransfers,
  managerTransferWindows,
  matchdays,
  players,
  scoringRuleSets,
  seasons,
} from "@/server/db/schema";
import { computeFreeAvailableForMatchday } from "@/server/domain/transfer-balance";
import {
  hasPriorSubmittedSquadInSeason,
  resolveBaseSquadPlayerIds,
} from "@/server/fantasy/transfer-base-squad";
import {
  isTransferModeEnabled,
  seasonTransferRulesFromRow,
  transferRulesApplyToMatchday,
} from "@/server/fantasy/transfer-rules";
import { loadSubmittedTeamsForSeason } from "@/server/queries/fantasy-team-view";
import {
  getPickTeamData,
  type PickTeamData,
} from "@/server/queries/pick-team-data";
import {
  getChipPageData,
  type ChipPageData,
} from "@/server/queries/chip-page-data";

export type TransferHistoryEntry = {
  matchdayId: string;
  number: number;
  playedOn: string;
  freeAvailable: number;
  made: number;
  pairs: {
    playerOutName: string;
    playerInName: string;
    playerOutKitKey: string | null;
    playerInKitKey: string | null;
    penalised: boolean;
  }[];
};

export type TransferPageData =
  | {
      mode: "standard";
      pick: PickTeamData;
      /** Unrestricted squad UI before transfer rules apply or before first squad exists. */
      standardReason: "transfers_disabled" | "initial_build";
    }
  | {
      mode: "transfers";
      pick: PickTeamData;
      teamVersion: number;
      basePlayerIds: readonly string[];
      freeAvailable: number;
      penaltyPerExtra: number;
      history: TransferHistoryEntry[];
      chips: ChipPageData | null;
    };

async function loadTransferHistory(
  db: AppDb,
  managerId: string,
  seasonId: string,
): Promise<TransferHistoryEntry[]> {
  const transferRows = await db
    .select({
      matchdayId: fantasyTransfers.matchdayId,
      number: matchdays.number,
      playedOn: matchdays.playedOn,
      seq: fantasyTransfers.seq,
      playerOutId: fantasyTransfers.playerOutId,
      playerInId: fantasyTransfers.playerInId,
      freeAvailable: managerTransferWindows.freeAvailable,
    })
    .from(fantasyTransfers)
    .innerJoin(matchdays, eq(fantasyTransfers.matchdayId, matchdays.id))
    .leftJoin(
      managerTransferWindows,
      and(
        eq(managerTransferWindows.matchdayId, matchdays.id),
        eq(managerTransferWindows.managerId, managerId),
      ),
    )
    .where(
      and(
        eq(fantasyTransfers.managerId, managerId),
        eq(fantasyTransfers.seasonId, seasonId),
        eq(fantasyTransfers.status, "active"),
        or(
          eq(matchdays.status, "published"),
          lt(matchdays.deadlineAt, sql`now()`),
        ),
      ),
    )
    .orderBy(desc(matchdays.number), asc(fantasyTransfers.seq));

  if (transferRows.length === 0) return [];

  const playerIds = [
    ...new Set(
      transferRows.flatMap((r) => [r.playerOutId, r.playerInId]),
    ),
  ];
  const nameRows = await db
    .select({
      id: players.id,
      displayName: players.displayName,
      kitKey: players.kitKey,
    })
    .from(players)
    .where(inArray(players.id, playerIds));
  const names = new Map(nameRows.map((p) => [p.id, p.displayName]));
  const kitKeys = new Map(
    nameRows.map((p) => [p.id, p.kitKey]),
  );

  const byMatchday = new Map<string, TransferHistoryEntry>();

  for (const row of transferRows) {
    let entry = byMatchday.get(row.matchdayId);
    if (!entry) {
      entry = {
        matchdayId: row.matchdayId,
        number: row.number,
        playedOn: row.playedOn,
        freeAvailable: row.freeAvailable ?? 0,
        made: 0,
        pairs: [],
      };
      byMatchday.set(row.matchdayId, entry);
    }
    entry.made += 1;
    entry.pairs.push({
      playerOutName: names.get(row.playerOutId) ?? "Out",
      playerInName: names.get(row.playerInId) ?? "In",
      playerOutKitKey: kitKeys.get(row.playerOutId) ?? null,
      playerInKitKey: kitKeys.get(row.playerInId) ?? null,
      penalised: row.seq > (row.freeAvailable ?? 0),
    });
  }

  return [...byMatchday.values()];
}

export async function getTransferPageData(
  db: AppDb,
  managerId: string,
  matchdayId?: string,
): Promise<TransferPageData | null> {
  const pick = await getPickTeamData(db, managerId, matchdayId);
  if (!pick) return null;

  const [ruleRow] = await db
    .select({
      transfersStartMatchday: scoringRuleSets.transfersStartMatchday,
      freeTransfersPerMatchday: scoringRuleSets.freeTransfersPerMatchday,
      maxBankedFreeTransfers: scoringRuleSets.maxBankedFreeTransfers,
      extraTransferPenalty: scoringRuleSets.extraTransferPenalty,
    })
    .from(seasons)
    .innerJoin(scoringRuleSets, eq(seasons.ruleSetId, scoringRuleSets.id))
    .where(eq(seasons.id, pick.seasonId))
    .limit(1);

  if (!ruleRow) {
    return { mode: "standard", pick, standardReason: "transfers_disabled" };
  }

  const transferRules = seasonTransferRulesFromRow(ruleRow);
  const transferMode =
    isTransferModeEnabled(transferRules.transfersStartMatchday) &&
    transferRulesApplyToMatchday(transferRules, pick.matchday.number);

  if (!transferMode) {
    return { mode: "standard", pick, standardReason: "transfers_disabled" };
  }

  const submitted = await loadSubmittedTeamsForSeason(db, pick.seasonId);
  const timeline = {
    matchdayId: pick.matchday.id,
    playedOn: pick.matchday.playedOn,
    number: pick.matchday.number,
    seasonStartsOn:
      submitted[0]?.matchday.seasonStartsOn ??
      (await db.select({ startsOn: seasons.startsOn }).from(seasons).where(eq(seasons.id, pick.seasonId)).limit(1))[0]
        ?.startsOn ??
      "1970-01-01",
  };

  const basePlayerIds = resolveBaseSquadPlayerIds(
    managerId,
    timeline,
    submitted,
  );
  const initialBuild = !hasPriorSubmittedSquadInSeason(
    managerId,
    timeline,
    submitted,
  );

  if (initialBuild || !basePlayerIds || basePlayerIds.length !== 5) {
    return { mode: "standard", pick, standardReason: "initial_build" };
  }

  const [teamRow] = await db
    .select({ version: fantasyTeams.version })
    .from(fantasyTeams)
    .where(
      and(
        eq(fantasyTeams.managerId, managerId),
        eq(fantasyTeams.matchdayId, pick.matchday.id),
      ),
    )
    .limit(1);

  const freeAvailable = await computeFreeAvailableForMatchday(db, {
    managerId,
    seasonId: pick.seasonId,
    matchdayId: pick.matchday.id,
    matchdayNumber: pick.matchday.number,
    transfersStartMatchday: transferRules.transfersStartMatchday!,
    rules: {
      grant: transferRules.grant,
      cap: transferRules.cap,
      penaltyPerExtra: transferRules.penaltyPerExtra,
    },
  });

  const history = await loadTransferHistory(db, managerId, pick.seasonId);

  const chips = await getChipPageData(db, {
    managerId,
    seasonId: pick.seasonId,
    matchdayId: pick.matchday.id,
    matchdayNumber: pick.matchday.number,
    selectionOpen: pick.selectionOpen,
    hasBaseSquad: basePlayerIds.length === 5,
    transferRulesApply: transferMode,
    isInitialBuild: initialBuild,
  });

  return {
    mode: "transfers",
    pick,
    teamVersion: teamRow?.version ?? 0,
    basePlayerIds,
    freeAvailable,
    penaltyPerExtra: transferRules.penaltyPerExtra,
    history,
    chips,
  };
}

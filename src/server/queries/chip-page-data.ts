import { and, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import {
  fantasyTeams,
  managerTransferWindows,
  matchdays,
} from "@/server/db/schema";
import {
  CHIP_CODES,
  CHIP_REGISTRY,
  type ChipCode,
} from "@/server/chips/registry";
import { CHIP_UI_COPY } from "@/server/chips/chip-ui-copy";
import {
  loadManagerActiveChipPlays,
  loadSeasonChipConfigs,
} from "@/server/domain/chip-plays";
import type { SquadKind } from "@/server/fantasy/effective-team";

export type ChipCardStatus =
  | { kind: "available" }
  | { kind: "active"; matchdayNumber: number }
  | { kind: "used"; matchdayNumber: number }
  | { kind: "unavailable"; reason: string };

export type ChipCardView = {
  code: ChipCode;
  label: string;
  effectLine: string;
  permanencePill: string;
  status: ChipCardStatus;
};

export type ChipPageData = {
  enabled: true;
  matchdayNumber: number;
  selectionOpen: boolean;
  chips: ChipCardView[];
  activeChipCode: ChipCode | null;
  savedSquadKind: SquadKind;
  savedReservePlayerId: string | null;
  windowChipCode: string | null;
  windowUnlimited: boolean;
};

export async function getChipPageData(
  db: AppDb,
  input: {
    managerId: string;
    seasonId: string;
    matchdayId: string;
    matchdayNumber: number;
    selectionOpen: boolean;
    hasBaseSquad: boolean;
    transferRulesApply: boolean;
    isInitialBuild: boolean;
  },
): Promise<ChipPageData | null> {
  const configs = await loadSeasonChipConfigs(db, input.seasonId);
  if (configs.length === 0) return null;

  const configByCode = new Map(configs.map((c) => [c.chipCode, c]));
  const activePlays = await loadManagerActiveChipPlays(
    db,
    input.seasonId,
    input.managerId,
  );

  const playOnThisGw = activePlays.find(
    (p) => p.matchdayId === input.matchdayId,
  );
  const activeChipCode = playOnThisGw?.chipCode ?? null;

  const usedMatchdayIds = [
    ...new Set(
      activePlays
        .filter((p) => p.matchdayId !== input.matchdayId)
        .map((p) => p.matchdayId),
    ),
  ];
  const gwNumberById = new Map<string, number>();
  if (usedMatchdayIds.length > 0) {
    const rows = await db
      .select({ id: matchdays.id, number: matchdays.number })
      .from(matchdays)
      .where(inArray(matchdays.id, usedMatchdayIds));
    for (const row of rows) gwNumberById.set(row.id, row.number);
  }

  const [teamRow] = await db
    .select({
      squadKind: fantasyTeams.squadKind,
      reservePlayerId: fantasyTeams.reservePlayerId,
    })
    .from(fantasyTeams)
    .where(
      and(
        eq(fantasyTeams.managerId, input.managerId),
        eq(fantasyTeams.matchdayId, input.matchdayId),
      ),
    )
    .limit(1);

  const [windowRow] = await db
    .select({
      chipCode: managerTransferWindows.chipCode,
      unlimited: managerTransferWindows.unlimited,
    })
    .from(managerTransferWindows)
    .where(
      and(
        eq(managerTransferWindows.managerId, input.managerId),
        eq(managerTransferWindows.matchdayId, input.matchdayId),
      ),
    )
    .limit(1);

  const chips: ChipCardView[] = CHIP_CODES.map((code) => {
    const entry = CHIP_REGISTRY[code];
    const ui = CHIP_UI_COPY[code];
    const config = configByCode.get(code);

    let status: ChipCardStatus = { kind: "available" };

    if (!config?.enabled) {
      status = {
        kind: "unavailable",
        reason: "Not enabled this season",
      };
    } else if (!input.selectionOpen) {
      status = { kind: "unavailable", reason: "Deadline passed" };
    } else if (input.matchdayNumber < config.availableFromMatchday) {
      status = {
        kind: "unavailable",
        reason: `Available from GW${config.availableFromMatchday}`,
      };
    } else if (
      entry.requiresTransferBase &&
      (input.isInitialBuild ||
        !input.hasBaseSquad ||
        !input.transferRulesApply)
    ) {
      status = {
        kind: "unavailable",
        reason: "Available from your second squad",
      };
    } else if (playOnThisGw?.chipCode === code) {
      status = {
        kind: "active",
        matchdayNumber: input.matchdayNumber,
      };
    } else {
      const usedElsewhere = activePlays.find(
        (p) => p.chipCode === code && p.matchdayId !== input.matchdayId,
      );
      if (usedElsewhere) {
        status = {
          kind: "used",
          matchdayNumber:
            gwNumberById.get(usedElsewhere.matchdayId) ?? input.matchdayNumber,
        };
      } else if (activeChipCode && activeChipCode !== code) {
        status = {
          kind: "unavailable",
          reason: "Another chip is active this gameweek",
        };
      }
    }

    return {
      code,
      label: entry.label,
      effectLine: ui.effectLine,
      permanencePill: ui.permanencePill,
      status,
    };
  });

  return {
    enabled: true,
    matchdayNumber: input.matchdayNumber,
    selectionOpen: input.selectionOpen,
    chips,
    activeChipCode,
    savedSquadKind: teamRow?.squadKind ?? "permanent",
    savedReservePlayerId: teamRow?.reservePlayerId ?? null,
    windowChipCode: windowRow?.chipCode ?? null,
    windowUnlimited: windowRow?.unlimited ?? false,
  };
}

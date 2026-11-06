import type {
  TransferHistoryEntry,
  TransferPageData,
} from "@/server/queries/transfer-page-data";
import { serializePickTeamData } from "@/components/pick/pick-team-types";

export type SerializedTransferPageData =
  | { mode: "legacy"; pick: ReturnType<typeof serializePickTeamData> }
  | {
      mode: "transfers";
      pick: ReturnType<typeof serializePickTeamData>;
      teamVersion: number;
      basePlayerIds: string[];
      freeAvailable: number;
      penaltyPerExtra: number;
      history: TransferHistoryEntry[];
    };

export function serializeTransferPageData(
  data: TransferPageData,
): SerializedTransferPageData {
  if (data.mode === "legacy") {
    return { mode: "legacy", pick: serializePickTeamData(data.pick) };
  }
  return {
    mode: "transfers",
    pick: serializePickTeamData(data.pick),
    teamVersion: data.teamVersion,
    basePlayerIds: [...data.basePlayerIds],
    freeAvailable: data.freeAvailable,
    penaltyPerExtra: data.penaltyPerExtra,
    history: data.history,
  };
}

export function transferDraftStorageKey(matchdayId: string) {
  return `fantasy:transfer-draft:${matchdayId}`;
}

export type LocalTransferDraft = {
  baseVersion: number;
  playerIds: string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
};

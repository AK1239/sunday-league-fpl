import type {
  TransferHistoryEntry,
  TransferPageData,
} from "@/server/queries/transfer-page-data";
import { serializePickTeamData } from "@/components/pick/pick-team-types";

export type SerializedTransferPageData =
  | {
      mode: "standard";
      pick: ReturnType<typeof serializePickTeamData>;
      standardReason: "transfers_disabled" | "initial_build";
    }
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
  if (data.mode === "standard") {
    return {
      mode: "standard",
      pick: serializePickTeamData(data.pick),
      standardReason: data.standardReason,
    };
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

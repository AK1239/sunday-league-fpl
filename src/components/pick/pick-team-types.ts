import type { PickTeamData } from "@/server/queries/pick-team-data";

export type SerializedPickTeamData = Omit<
  PickTeamData,
  "serverNow" | "matchday"
> & {
  serverNow: string;
  matchday: Omit<PickTeamData["matchday"], "deadlineAt"> & {
    deadlineAt: string;
  };
};

export function serializePickTeamData(data: PickTeamData): SerializedPickTeamData {
  return {
    ...data,
    serverNow: data.serverNow.toISOString(),
    matchday: {
      ...data.matchday,
      deadlineAt: data.matchday.deadlineAt.toISOString(),
    },
  };
}

export function draftStorageKey(matchdayId: string) {
  return `fantasy:pick-draft:${matchdayId}`;
}

export type LocalPickDraft = {
  slots: (string | null)[];
  captainPlayerId: string | null;
  viceCaptainPlayerId: string | null;
};

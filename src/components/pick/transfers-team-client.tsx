"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/app-toast";
import { PageHeader } from "@/components/fantasy/page-header";
import { DeadlineCountdown } from "@/components/pick/deadline-countdown";
import { LockedBanner } from "@/components/pick/locked-banner";
import { PlayerPickerSheet } from "@/components/pick/player-picker-sheet";
import { SlotActionSheet } from "@/components/pick/slot-action-sheet";
import { TransferConfirmSheet } from "@/components/pick/transfer-confirm-sheet";
import { TransferHistoryTab } from "@/components/pick/transfer-history-tab";
import { TransferPitchSlots } from "@/components/pick/transfer-pitch-slots";
import { TransferSummaryStrip } from "@/components/pick/transfer-summary-strip";
import {
  transferDraftStorageKey,
  type LocalTransferDraft,
  type SerializedTransferPageData,
} from "@/components/pick/transfer-types";
import type { SerializedPickTeamData } from "@/components/pick/pick-team-types";
import { submitTeamAction } from "@/server/actions/submit-team";
import { diffSquads } from "@/server/fantasy/transfer-diff";
import { summariseTransferWindow } from "@/server/fantasy/transfer-summary";
import {
  validateFantasyTeamTransferLineup,
  validateFantasyTeamTransferPick,
} from "@/server/fantasy/validate-transfers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function teamToSlots(playerIds: readonly string[]): (string | null)[] {
  return playerIds.slice(0, 5).map((id) => id);
}

function readLocalDraft(
  matchdayId: string,
  baseVersion: number,
): LocalTransferDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(transferDraftStorageKey(matchdayId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocalTransferDraft;
    if (draft.baseVersion !== baseVersion) return null;
    return draft;
  } catch {
    return null;
  }
}

function writeLocalDraft(matchdayId: string, draft: LocalTransferDraft) {
  try {
    localStorage.setItem(
      transferDraftStorageKey(matchdayId),
      JSON.stringify(draft),
    );
  } catch {
    /* ignore */
  }
}

function clearLocalDraft(matchdayId: string) {
  try {
    localStorage.removeItem(transferDraftStorageKey(matchdayId));
  } catch {
    /* ignore */
  }
}

type SavedTeamPick = {
  playerIds: readonly string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
};

function teamPickMatchesSaved(
  playerIds: readonly string[],
  captainPlayerId: string | null,
  viceCaptainPlayerId: string | null,
  saved: SavedTeamPick | null | undefined,
): boolean {
  if (!saved || saved.playerIds.length !== 5 || playerIds.length !== 5) {
    return false;
  }
  if (captainPlayerId == null || viceCaptainPlayerId == null) return false;
  for (let i = 0; i < 5; i += 1) {
    if (playerIds[i] !== saved.playerIds[i]) return false;
  }
  return (
    captainPlayerId === saved.captainPlayerId &&
    viceCaptainPlayerId === saved.viceCaptainPlayerId
  );
}

function shouldStartEditing(
  pick: SerializedPickTeamData,
  teamVersion: number,
): boolean {
  const saved = pick.myTeam;
  if (!saved || saved.playerIds.length !== 5) return true;
  const draft = readLocalDraft(pick.matchday.id, teamVersion);
  if (draft?.playerIds.length === 5) {
    return !teamPickMatchesSaved(
      draft.playerIds,
      draft.captainPlayerId,
      draft.viceCaptainPlayerId,
      saved,
    );
  }
  return false;
}

export function TransfersTeamClient({
  initial,
}: {
  initial: Extract<SerializedTransferPageData, { mode: "transfers" }>;
}) {
  const router = useRouter();
  const pick = initial.pick;
  const playerById = useMemo(
    () => new Map(pick.players.map((p) => [p.id, p])),
    [pick.players],
  );
  const basePlayerIds = initial.basePlayerIds;

  const [teamVersion, setTeamVersion] = useState(initial.teamVersion);
  const [draftStaleNotice, setDraftStaleNotice] = useState(false);
  const [tab, setTab] = useState<"team" | "history">("team");

  const [slots, setSlots] = useState<(string | null)[]>(() => {
    const fromTeam =
      pick.myTeam?.playerIds.length === 5
        ? teamToSlots(pick.myTeam.playerIds)
        : teamToSlots(basePlayerIds);
    const draft = readLocalDraft(pick.matchday.id, initial.teamVersion);
    if (draft?.playerIds.length === 5) return teamToSlots(draft.playerIds);
    return fromTeam;
  });

  const [captainPlayerId, setCaptainPlayerId] = useState<string | null>(() => {
    const draft = readLocalDraft(pick.matchday.id, initial.teamVersion);
    return (
      pick.myTeam?.captainPlayerId ??
      draft?.captainPlayerId ??
      basePlayerIds[0] ??
      null
    );
  });
  const [viceCaptainPlayerId, setViceCaptainPlayerId] = useState<string | null>(
    () => {
      const draft = readLocalDraft(pick.matchday.id, initial.teamVersion);
      return (
        pick.myTeam?.viceCaptainPlayerId ??
        draft?.viceCaptainPlayerId ??
        basePlayerIds[1] ??
        null
      );
    },
  );

  const [pendingOutSlot, setPendingOutSlot] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [wizardStep, setWizardStep] = useState<"lineup" | "captaincy">(
    "lineup",
  );
  const [isEditing, setIsEditing] = useState(() =>
    shouldStartEditing(pick, initial.teamVersion),
  );

  const readOnly = pick.locked || !pick.selectionOpen;
  const savedTeam = pick.myTeam;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(transferDraftStorageKey(pick.matchday.id));
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as LocalTransferDraft;
      if (draft.baseVersion !== initial.teamVersion) {
        setDraftStaleNotice(true);
        clearLocalDraft(pick.matchday.id);
      }
    } catch {
      /* ignore */
    }
  }, [pick.matchday.id, initial.teamVersion]);

  useEffect(() => {
    if (pick.myTeam?.playerIds.length === 5) {
      setSlots(teamToSlots(pick.myTeam.playerIds));
      setCaptainPlayerId(pick.myTeam.captainPlayerId);
      setViceCaptainPlayerId(pick.myTeam.viceCaptainPlayerId);
      setTeamVersion(initial.teamVersion);
    }
  }, [pick.myTeam, initial.teamVersion]);

  const plannedIds = useMemo(
    () => slots.filter((id): id is string => Boolean(id)),
    [slots],
  );

  const diff = useMemo(
    () => diffSquads(basePlayerIds, plannedIds),
    [basePlayerIds, plannedIds],
  );
  const incomingIds = useMemo(() => new Set(diff.in), [diff.in]);

  const summary = useMemo(
    () =>
      summariseTransferWindow({
        baseSquad: basePlayerIds,
        nextSquad: plannedIds,
        freeAvailable: initial.freeAvailable,
        penaltyPerExtra: initial.penaltyPerExtra,
      }),
    [
      basePlayerIds,
      plannedIds,
      initial.freeAvailable,
      initial.penaltyPerExtra,
    ],
  );

  const pickerWouldBeExtra = useMemo(() => {
    if (pendingOutSlot == null) return false;
    const hypotheticalMade = summary.made + 1;
    return hypotheticalMade > initial.freeAvailable;
  }, [pendingOutSlot, summary.made, initial.freeAvailable]);

  const matchesSavedTeam = useMemo(
    () =>
      teamPickMatchesSaved(
        plannedIds,
        captainPlayerId,
        viceCaptainPlayerId,
        savedTeam,
      ),
    [plannedIds, captainPlayerId, viceCaptainPlayerId, savedTeam],
  );

  useEffect(() => {
    if (readOnly || !isEditing) return;
    if (plannedIds.length !== 5) return;
    writeLocalDraft(pick.matchday.id, {
      baseVersion: teamVersion,
      playerIds: plannedIds,
      captainPlayerId: captainPlayerId!,
      viceCaptainPlayerId: viceCaptainPlayerId!,
    });
  }, [
    plannedIds,
    captainPlayerId,
    viceCaptainPlayerId,
    pick.matchday.id,
    readOnly,
    isEditing,
    teamVersion,
  ]);

  const pickForValidation = useMemo(() => {
    if (
      plannedIds.length !== 5 ||
      !captainPlayerId ||
      !viceCaptainPlayerId
    ) {
      return null;
    }
    return {
      playerIds: plannedIds,
      captainPlayerId,
      viceCaptainPlayerId,
    };
  }, [plannedIds, captainPlayerId, viceCaptainPlayerId]);

  const eligible = useMemo(
    () =>
      new Map(
        pick.players.map((p) => [p.id, { id: p.id, active: true } as const]),
      ),
    [pick.players],
  );

  useEffect(() => {
    setCaptainPlayerId((c) =>
      c && plannedIds.includes(c) ? c : null,
    );
    setViceCaptainPlayerId((v) =>
      v && plannedIds.includes(v) ? v : null,
    );
  }, [plannedIds]);

  useEffect(() => {
    if (
      captainPlayerId &&
      viceCaptainPlayerId &&
      captainPlayerId === viceCaptainPlayerId
    ) {
      setViceCaptainPlayerId(null);
    }
  }, [captainPlayerId, viceCaptainPlayerId]);

  const canAdvanceLineup = useMemo(() => {
    if (readOnly || pendingOutSlot != null || plannedIds.length !== 5) {
      return false;
    }
    return validateFantasyTeamTransferLineup(
      plannedIds,
      basePlayerIds,
      eligible,
    ).ok;
  }, [readOnly, pendingOutSlot, plannedIds, basePlayerIds, eligible]);

  const lineupBlockedMessage = useMemo(() => {
    if (readOnly) return null;
    if (pendingOutSlot != null) {
      return "Pick a replacement to finish this transfer.";
    }
    if (plannedIds.length !== 5) {
      return "Your squad must have 5 players.";
    }
    const result = validateFantasyTeamTransferLineup(
      plannedIds,
      basePlayerIds,
      eligible,
    );
    return result.ok ? null : result.message;
  }, [readOnly, pendingOutSlot, plannedIds, basePlayerIds, eligible]);

  const canAdvanceCaptaincy = useMemo(() => {
    if (readOnly || !pickForValidation) return false;
    if (pendingOutSlot != null) return false;
    if (!captainPlayerId || !viceCaptainPlayerId) return false;
    if (captainPlayerId === viceCaptainPlayerId) return false;
    if (!plannedIds.includes(captainPlayerId)) return false;
    if (!plannedIds.includes(viceCaptainPlayerId)) return false;
    return true;
  }, [
    readOnly,
    pickForValidation,
    pendingOutSlot,
    captainPlayerId,
    viceCaptainPlayerId,
    plannedIds,
  ]);

  const captaincyBlockedMessage = useMemo(() => {
    if (readOnly || wizardStep !== "captaincy") return null;
    if (!captainPlayerId || !viceCaptainPlayerId) {
      return "Tap a player to choose captain and vice-captain.";
    }
    if (captainPlayerId === viceCaptainPlayerId) {
      return "Captain and vice-captain must be different players.";
    }
    return null;
  }, [
    readOnly,
    wizardStep,
    captainPlayerId,
    viceCaptainPlayerId,
  ]);

  const canConfirm = useMemo(() => {
    if (readOnly || !pickForValidation || pendingOutSlot != null) return false;
    return validateFantasyTeamTransferPick(
      pickForValidation,
      basePlayerIds,
      eligible,
    ).ok;
  }, [
    readOnly,
    pickForValidation,
    pendingOutSlot,
    basePlayerIds,
    eligible,
  ]);

  const selectedIds = useMemo(() => new Set(plannedIds), [plannedIds]);

  const handleSlotPress = useCallback(
    (index: number) => {
      if (readOnly) return;
      const playerId = slots[index];
      if (playerId) {
        setActiveSlot(index);
        setActionOpen(true);
      }
    },
    [readOnly, slots],
  );

  const assignPlayerToSlot = useCallback(
    (playerId: string) => {
      if (activeSlot == null) return;
      setPendingOutSlot(null);
      setSlots((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex((id) => id === playerId);
        if (existingIndex >= 0) next[existingIndex] = null;
        next[activeSlot] = playerId;
        return next;
      });
    },
    [activeSlot],
  );

  function resetToSavedTeam() {
    setPendingOutSlot(null);
    setWizardStep("lineup");
    if (savedTeam?.playerIds.length === 5) {
      setSlots(teamToSlots(savedTeam.playerIds));
      setCaptainPlayerId(savedTeam.captainPlayerId);
      setViceCaptainPlayerId(savedTeam.viceCaptainPlayerId);
      return;
    }
    setSlots(teamToSlots(basePlayerIds));
    setCaptainPlayerId(basePlayerIds[0] ?? null);
    setViceCaptainPlayerId(
      basePlayerIds.find((id) => id !== basePlayerIds[0]) ?? null,
    );
  }

  async function handleConfirm(acknowledgedPenalty: number) {
    if (!pickForValidation || !canConfirm) return;
    setConfirming(true);
    const result = await submitTeamAction(pick.matchday.id, {
      ...pickForValidation,
      expectedVersion: teamVersion,
      acknowledgedPenalty,
    });
    setConfirming(false);
    if (result.ok === false) {
      if (result.code === "CONFLICT") {
        appToast.error(`${result.message} Reloading…`);
        router.refresh();
        return;
      }
      appToast.error(result.message);
      return;
    }
    const made = result.data.summary?.made ?? summary.made;
    const extra = result.data.summary?.extra ?? 0;
    appToast.success(
      extra > 0
        ? `Team confirmed — ${made} transfers (${extra} extra)`
        : made > 0
          ? `Team confirmed — ${made} transfer${made === 1 ? "" : "s"} (free)`
          : "Team confirmed",
    );
    clearLocalDraft(pick.matchday.id);
    setTeamVersion(result.data.version);
    setConfirmOpen(false);
    setWizardStep("lineup");
    setIsEditing(false);
    router.refresh();
  }

  const activePlayerId = activeSlot != null ? slots[activeSlot] : null;
  const activePlayer = activePlayerId
    ? playerById.get(activePlayerId)
    : undefined;

  const playerNameById = useMemo(
    () => new Map(pick.players.map((p) => [p.id, p.displayName])),
    [pick.players],
  );

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        eyebrow={`Gameweek ${pick.matchday.number}`}
        title="Transfers"
        description={`${pick.matchday.playedOn} · Change players before the deadline.`}
      />

      <div className="sticky top-0 z-20 space-y-3 rounded-2xl border border-border/50 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Deadline
            </p>
            <DeadlineCountdown
              deadlineAtIso={pick.matchday.deadlineAt}
              serverNowIso={pick.serverNow}
            />
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-primary tabular-nums">
            {initial.freeAvailable} free
          </span>
        </div>
        <TransferSummaryStrip
          summary={summary}
          freeAvailable={initial.freeAvailable}
        />
      </div>

      {draftStaleNotice ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
          Your saved draft was cleared because the squad changed on the server.
        </p>
      ) : null}

      <div className="flex gap-2 rounded-xl bg-muted/40 p-1">
        {(["team", "history"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === key
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {key === "team" ? "Team" : "History"}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <TransferHistoryTab history={initial.history} />
      ) : (
        <>
          {readOnly ? <LockedBanner /> : null}

          {!readOnly && isEditing ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {wizardStep === "captaincy" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWizardStep("lineup")}
                >
                  Back to transfers
                </Button>
              ) : (
                <span />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToSavedTeam}
                disabled={
                  matchesSavedTeam && pendingOutSlot == null
                }
              >
                Reset to saved team
              </Button>
            </div>
          ) : null}

          {!readOnly && !isEditing && savedTeam ? (
            <p
              className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground"
              role="status"
            >
              Team saved for this gameweek — captain and vice are set below.
              Tap <span className="font-medium text-foreground">Edit team</span>{" "}
              to make more changes before the deadline.
            </p>
          ) : null}

          {wizardStep === "captaincy" && !readOnly && isEditing ? (
            <p className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Choose a captain and vice-captain from your squad. Tap a player
              below — these changes are free.
            </p>
          ) : null}

          <TransferPitchSlots
            selection={slots}
            captainPlayerId={captainPlayerId}
            viceCaptainPlayerId={viceCaptainPlayerId}
            playerById={playerById}
            disabled={readOnly || !isEditing}
            pendingOutSlot={pendingOutSlot}
            incomingIds={incomingIds}
            showRoleBadges={!isEditing || wizardStep === "captaincy"}
            showIncomingBadges={isEditing && wizardStep === "lineup"}
            onSlotPress={handleSlotPress}
            onUndoPending={(index) => {
              if (pendingOutSlot === index) setPendingOutSlot(null);
            }}
          />

          {!readOnly ? (
            <div className="glass fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:rounded-2xl md:border md:bg-card/80">
              {!isEditing && savedTeam ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full sm:flex-1"
                    onClick={() => {
                      setIsEditing(true);
                      setWizardStep("lineup");
                    }}
                  >
                    Edit team
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full sm:flex-1"
                    onClick={() => {
                      setIsEditing(true);
                      setWizardStep("captaincy");
                    }}
                  >
                    Change captain / vice
                  </Button>
                </div>
              ) : wizardStep === "lineup" ? (
                <>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={!canAdvanceLineup}
                    onClick={() => setWizardStep("captaincy")}
                  >
                    Next
                  </Button>
                  {lineupBlockedMessage ? (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {lineupBlockedMessage}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={!canConfirm || confirming}
                    aria-busy={confirming}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Review & confirm
                  </Button>
                  {captaincyBlockedMessage ? (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {captaincyBlockedMessage}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </>
      )}

      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPendingOutSlot(null);
        }}
        players={pick.players}
        selectedIds={selectedIds}
        onSelect={assignPlayerToSlot}
        costBanner={
          pickerWouldBeExtra
            ? `This transfer costs −${initial.penaltyPerExtra}`
            : null
        }
      />

      {activePlayer ? (
        <SlotActionSheet
          open={actionOpen}
          onClose={() => setActionOpen(false)}
          playerName={activePlayer.displayName}
          isCaptain={activePlayerId === captainPlayerId}
          isVice={activePlayerId === viceCaptainPlayerId}
          transferMode
          showCaptainActions={isEditing && wizardStep === "captaincy"}
          showSquadEditActions={isEditing && wizardStep === "lineup"}
          onMakeCaptain={() => {
            if (activePlayerId) {
              setCaptainPlayerId(activePlayerId);
              if (viceCaptainPlayerId === activePlayerId) {
                setViceCaptainPlayerId(null);
              }
            }
          }}
          onMakeVice={() => {
            if (activePlayerId) {
              setViceCaptainPlayerId(activePlayerId);
              if (captainPlayerId === activePlayerId) {
                setCaptainPlayerId(null);
              }
            }
          }}
          onReplace={() => {
            setActionOpen(false);
            if (activeSlot != null) setPendingOutSlot(activeSlot);
            setPickerOpen(true);
          }}
        />
      ) : null}

      <TransferConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        confirming={confirming}
        basePlayerIds={basePlayerIds}
        plannedPlayerIds={plannedIds}
        summary={summary}
        freeAvailable={initial.freeAvailable}
        playerNameById={playerNameById}
      />
    </div>
  );
}

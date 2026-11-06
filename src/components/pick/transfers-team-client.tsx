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
import { submitTeamAction } from "@/server/actions/submit-team";
import { diffSquads } from "@/server/fantasy/transfer-diff";
import { summariseTransferWindow } from "@/server/fantasy/transfer-summary";
import { validateFantasyTeamTransferPick } from "@/server/fantasy/validate-transfers";
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

  const readOnly = pick.locked || !pick.selectionOpen;

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

  useEffect(() => {
    if (readOnly) return;
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
      if (!captainPlayerId) setCaptainPlayerId(playerId);
      else if (!viceCaptainPlayerId && playerId !== captainPlayerId) {
        setViceCaptainPlayerId(playerId);
      }
    },
    [activeSlot, captainPlayerId, viceCaptainPlayerId],
  );

  function resetToBase() {
    setSlots(teamToSlots(basePlayerIds));
    setPendingOutSlot(null);
    if (pick.myTeam) {
      setCaptainPlayerId(pick.myTeam.captainPlayerId);
      setViceCaptainPlayerId(pick.myTeam.viceCaptainPlayerId);
    }
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

          {!readOnly ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToBase}
                disabled={summary.made === 0 && pendingOutSlot == null}
              >
                Reset to current squad
              </Button>
            </div>
          ) : null}

          <TransferPitchSlots
            selection={slots}
            captainPlayerId={captainPlayerId}
            viceCaptainPlayerId={viceCaptainPlayerId}
            playerById={playerById}
            disabled={readOnly}
            pendingOutSlot={pendingOutSlot}
            incomingIds={incomingIds}
            onSlotPress={handleSlotPress}
            onUndoPending={(index) => {
              if (pendingOutSlot === index) setPendingOutSlot(null);
            }}
          />

          {!readOnly ? (
            <div className="glass fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:rounded-2xl md:border md:bg-card/80">
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

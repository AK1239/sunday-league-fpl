"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/app-toast";
import { PageHeader } from "@/components/fantasy/page-header";
import { DeadlineCountdown } from "@/components/pick/deadline-countdown";
import { LockedBanner } from "@/components/pick/locked-banner";
import { PitchSlots } from "@/components/pick/pitch-slots";
import { PlayerPickerSheet } from "@/components/pick/player-picker-sheet";
import { SlotActionSheet } from "@/components/pick/slot-action-sheet";
import {
  draftStorageKey,
  type LocalPickDraft,
  type SerializedPickTeamData,
} from "@/components/pick/pick-team-types";
import { saveFantasyTeamAction } from "@/server/actions/fantasy-team";
import { validateFantasyTeam } from "@/server/fantasy/validate-team";
import { Button } from "@/components/ui/button";

const EMPTY_SLOTS: (string | null)[] = [null, null, null, null, null];

function teamToSlots(playerIds: readonly string[]): (string | null)[] {
  const slots: (string | null)[] = [...EMPTY_SLOTS];
  playerIds.slice(0, 5).forEach((id, index) => {
    slots[index] = id;
  });
  return slots;
}

function readLocalDraft(matchdayId: string): LocalPickDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(matchdayId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalPickDraft;
  } catch {
    return null;
  }
}

function writeLocalDraft(matchdayId: string, draft: LocalPickDraft) {
  try {
    localStorage.setItem(draftStorageKey(matchdayId), JSON.stringify(draft));
  } catch {
    /* quota or private mode */
  }
}

function clearLocalDraft(matchdayId: string) {
  try {
    localStorage.removeItem(draftStorageKey(matchdayId));
  } catch {
    /* ignore */
  }
}

export function PickTeamClient({
  initial,
  standardReason,
}: {
  initial: SerializedPickTeamData;
  standardReason?: "transfers_disabled" | "initial_build";
}) {
  const header =
    standardReason === "initial_build"
      ? {
          title: "Build your squad",
          description: `${initial.matchday.playedOn} · Pick your first five (free, no transfer limits). After this, changes count as transfers.`,
        }
      : standardReason === "transfers_disabled"
        ? {
            title: "Pick team",
            description: `${initial.matchday.playedOn} · Transfer rules are not active for this gameweek yet. You can still pick any five.`,
          }
        : {
            title: "Pick team",
            description: `${initial.matchday.playedOn} · Choose 5 players, captain and vice.`,
          };
  const router = useRouter();
  const playerById = useMemo(
    () => new Map(initial.players.map((p) => [p.id, p])),
    [initial.players],
  );

  const [slots, setSlots] = useState<(string | null)[]>(() => {
    if (initial.myTeam?.playerIds.length === 5) {
      return teamToSlots(initial.myTeam.playerIds);
    }
    const draft = readLocalDraft(initial.matchday.id);
    if (draft?.slots?.length === 5) return draft.slots;
    return [...EMPTY_SLOTS];
  });

  const [captainPlayerId, setCaptainPlayerId] = useState<string | null>(
    () =>
      initial.myTeam?.captainPlayerId ??
      readLocalDraft(initial.matchday.id)?.captainPlayerId ??
      null,
  );
  const [viceCaptainPlayerId, setViceCaptainPlayerId] = useState<string | null>(
    () =>
      initial.myTeam?.viceCaptainPlayerId ??
      readLocalDraft(initial.matchday.id)?.viceCaptainPlayerId ??
      null,
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const readOnly = initial.locked || !initial.selectionOpen;
  const selectedCount = slots.filter(Boolean).length;

  const selectedIds = useMemo(
    () => new Set(slots.filter((id): id is string => Boolean(id))),
    [slots],
  );

  useEffect(() => {
    if (initial.myTeam?.playerIds.length === 5) {
      setSlots(teamToSlots(initial.myTeam.playerIds));
      setCaptainPlayerId(initial.myTeam.captainPlayerId);
      setViceCaptainPlayerId(initial.myTeam.viceCaptainPlayerId);
    }
  }, [initial.myTeam]);

  useEffect(() => {
    if (readOnly) return;
    writeLocalDraft(initial.matchday.id, {
      slots,
      captainPlayerId,
      viceCaptainPlayerId,
    });
  }, [
    slots,
    captainPlayerId,
    viceCaptainPlayerId,
    initial.matchday.id,
    readOnly,
  ]);

  const pickForValidation = useMemo(() => {
    const playerIds = slots.filter((id): id is string => Boolean(id));
    if (playerIds.length !== 5 || !captainPlayerId || !viceCaptainPlayerId) {
      return null;
    }
    return {
      playerIds,
      captainPlayerId,
      viceCaptainPlayerId,
    };
  }, [slots, captainPlayerId, viceCaptainPlayerId]);

  const canSave = useMemo(() => {
    if (readOnly || !pickForValidation) return false;
    const eligible = new Map(
      initial.players.map((p) => [p.id, { id: p.id, active: true }]),
    );
    return validateFantasyTeam(pickForValidation, eligible).ok;
  }, [readOnly, pickForValidation, initial.players]);

  const liveMessage = `${selectedCount} of 5 players selected`;

  const handleSlotPress = useCallback(
    (index: number) => {
      if (readOnly) return;
      const playerId = slots[index];
      if (playerId) {
        setActiveSlot(index);
        setActionOpen(true);
      } else {
        setActiveSlot(index);
        setPickerOpen(true);
      }
    },
    [readOnly, slots],
  );

  const assignPlayerToSlot = useCallback(
    (playerId: string) => {
      if (activeSlot == null) return;
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

  const removeFromSlot = useCallback(
    (index: number) => {
      const removed = slots[index];
      setSlots((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      if (removed === captainPlayerId) setCaptainPlayerId(null);
      if (removed === viceCaptainPlayerId) setViceCaptainPlayerId(null);
    },
    [slots, captainPlayerId, viceCaptainPlayerId],
  );

  async function handleSave() {
    if (!pickForValidation || !canSave) return;
    setSaving(true);
    const result = await saveFantasyTeamAction(
      initial.matchday.id,
      pickForValidation,
    );
    setSaving(false);
    if (result.ok === false) {
      appToast.error(result.message);
      return;
    }
    appToast.success("Team saved");
    clearLocalDraft(initial.matchday.id);
    router.refresh();
  }

  const activePlayerId = activeSlot != null ? slots[activeSlot] : null;
  const activePlayer = activePlayerId
    ? playerById.get(activePlayerId)
    : undefined;

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        eyebrow={`Gameweek ${initial.matchday.number}`}
        title={header.title}
        description={header.description}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/40 px-4 py-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Deadline
          </p>
          <DeadlineCountdown
            deadlineAtIso={initial.matchday.deadlineAt}
            serverNowIso={initial.serverNow}
          />
        </div>
        <p
          className="text-sm font-semibold tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {liveMessage}
        </p>
      </div>

      {initial.myTeamSource === "carry_over" && !readOnly ? (
        <p
          className="rounded-xl border border-team-b/30 bg-team-b/10 px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          Carried over from your previous gameweek team. You can still change it
          until the deadline.
        </p>
      ) : null}

      {!initial.myTeam && selectedCount === 0 && !readOnly ? (
        <p className="text-sm text-muted-foreground">
          No team saved yet — tap a slot to start building your five.
        </p>
      ) : null}

      {readOnly ? <LockedBanner /> : null}

      <PitchSlots
        selection={slots}
        captainPlayerId={captainPlayerId}
        viceCaptainPlayerId={viceCaptainPlayerId}
        playerById={playerById}
        disabled={readOnly}
        onSlotPress={handleSlotPress}
      />

      {!readOnly ? (
        <div className="glass fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:rounded-2xl md:border md:bg-card/80">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSave || saving}
            aria-busy={saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save team"}
          </Button>
          {!canSave && selectedCount > 0 ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Pick 5 players with captain and vice-captain to save.
            </p>
          ) : null}
        </div>
      ) : null}

      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        players={initial.players}
        selectedIds={selectedIds}
        onSelect={assignPlayerToSlot}
      />

      {activePlayer ? (
        <SlotActionSheet
          open={actionOpen}
          onClose={() => setActionOpen(false)}
          playerName={activePlayer.displayName}
          isCaptain={activePlayerId === captainPlayerId}
          isVice={activePlayerId === viceCaptainPlayerId}
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
          onRemove={() => {
            if (activeSlot != null) removeFromSlot(activeSlot);
          }}
          onReplace={() => {
            setActionOpen(false);
            setPickerOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}

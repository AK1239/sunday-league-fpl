"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FantasyPitch } from "@/components/manager/fantasy-pitch";
import { SlotActionSheet } from "@/components/pick/slot-action-sheet";
import { appToast } from "@/lib/app-toast";
import { saveFantasyTeamAction } from "@/server/actions/fantasy-team";
import type { FantasyTeamPlayerSlot } from "@/server/queries/fantasy-team-view";

function roleForPlayer(
  playerId: string,
  captainPlayerId: string,
  viceCaptainPlayerId: string,
): FantasyTeamPlayerSlot["role"] {
  if (playerId === captainPlayerId) return "captain";
  if (playerId === viceCaptainPlayerId) return "vice_captain";
  return "player";
}

function slotsWithRoles(
  slots: FantasyTeamPlayerSlot[],
  captainPlayerId: string,
  viceCaptainPlayerId: string,
): FantasyTeamPlayerSlot[] {
  return slots.map((slot) => ({
    ...slot,
    role: roleForPlayer(slot.playerId, captainPlayerId, viceCaptainPlayerId),
  }));
}

function readCaptainIds(slots: FantasyTeamPlayerSlot[]) {
  return {
    captainPlayerId:
      slots.find((s) => s.role === "captain")?.playerId ??
      slots[0]?.playerId ??
      "",
    viceCaptainPlayerId:
      slots.find((s) => s.role === "vice_captain")?.playerId ??
      slots[1]?.playerId ??
      "",
  };
}

export function MyTeamEditablePitch({
  matchdayId,
  teamVersion: initialTeamVersion,
  slots: initialSlots,
  teamSourceLabel,
}: {
  matchdayId: string;
  /** Row version for optimistic locking; 0 for carry-over display only. */
  teamVersion: number;
  slots: FantasyTeamPlayerSlot[];
  teamSourceLabel: string;
}) {
  const router = useRouter();
  const [teamVersion, setTeamVersion] = useState(initialTeamVersion);
  useEffect(() => {
    setTeamVersion(initialTeamVersion);
  }, [initialTeamVersion]);
  const initialRoles = readCaptainIds(initialSlots);
  const [captainPlayerId, setCaptainPlayerId] = useState(
    initialRoles.captainPlayerId,
  );
  const [viceCaptainPlayerId, setViceCaptainPlayerId] = useState(
    initialRoles.viceCaptainPlayerId,
  );
  const [slots, setSlots] = useState(initialSlots);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const activePlayer = slots.find((s) => s.playerId === activePlayerId) ?? null;
  const playerIds = slots.map((s) => s.playerId);

  const persistRoles = useCallback(
    async (captain: string, vice: string, nextSlots: FantasyTeamPlayerSlot[]) => {
      setSaving(true);
      const result = await saveFantasyTeamAction(matchdayId, {
        playerIds,
        captainPlayerId: captain,
        viceCaptainPlayerId: vice,
        expectedVersion: teamVersion,
      });
      setSaving(false);
      if (result.ok) {
        setCaptainPlayerId(captain);
        setViceCaptainPlayerId(vice);
        setSlots(nextSlots);
        setTeamVersion(result.data.version);
        appToast.success("Team updated");
        router.refresh();
      } else {
        if (result.code === "CONFLICT") {
          appToast.error(`${result.message} Reloading…`);
          router.refresh();
          return;
        }
        appToast.error(result.message);
      }
    },
    [matchdayId, playerIds, router, teamVersion],
  );

  async function makeCaptain() {
    if (!activePlayerId || saving) return;
    let nextCaptain = activePlayerId;
    let nextVice = viceCaptainPlayerId;
    if (nextVice === nextCaptain) {
      nextVice =
        captainPlayerId !== nextCaptain
          ? captainPlayerId
          : (playerIds.find((id) => id !== nextCaptain) ?? nextVice);
    }
    const nextSlots = slotsWithRoles(slots, nextCaptain, nextVice);
    await persistRoles(nextCaptain, nextVice, nextSlots);
  }

  async function makeVice() {
    if (!activePlayerId || saving) return;
    let nextVice = activePlayerId;
    let nextCaptain = captainPlayerId;
    if (nextCaptain === nextVice) {
      nextCaptain =
        viceCaptainPlayerId !== nextVice
          ? viceCaptainPlayerId
          : (playerIds.find((id) => id !== nextVice) ?? nextCaptain);
    }
    const nextSlots = slotsWithRoles(slots, nextCaptain, nextVice);
    await persistRoles(nextCaptain, nextVice, nextSlots);
  }

  function openSheet(playerId: string) {
    setActivePlayerId(playerId);
    setSheetOpen(true);
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {teamSourceLabel}
        </p>
        <FantasyPitch slots={slots} onSelectPlayer={openSheet} />
      </div>

      {activePlayer ? (
        <SlotActionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          playerName={activePlayer.displayName}
          playerKitKey={activePlayer.kitKey}
          isCaptain={activePlayerId === captainPlayerId}
          isVice={activePlayerId === viceCaptainPlayerId}
          onMakeCaptain={() => void makeCaptain()}
          onMakeVice={() => void makeVice()}
          showSquadEditActions={false}
          onViewPlayer={() => {
            setSheetOpen(false);
            router.push(`/players/${activePlayer.playerId}`);
          }}
        />
      ) : null}
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActiveChipBanner } from "@/components/pick/active-chip-banner";
import { ChipDetailDrawer } from "@/components/pick/chip-detail-drawer";
import { ChipRail } from "@/components/pick/chip-rail";
import { appToast } from "@/lib/app-toast";
import { submitTeamAction } from "@/server/actions/submit-team";
import type { ChipCode } from "@/server/chips/registry";
import type {
  ChipPageData,
  ChipCardView,
} from "@/server/queries/chip-page-data";

type TeamForChip = {
  playerIds: string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
  teamVersion: number;
};

/**
 * Chip strip for the My team page. Triple Captain can be played / cancelled in
 * place; the other chips need the squad editor, so they deep-link to /pick.
 */
export function MyTeamChips({
  matchdayId,
  chips,
  team,
}: {
  matchdayId: string;
  chips: ChipPageData;
  /** Null when there is no saved lineup yet. */
  team: TeamForChip | null;
}) {
  const router = useRouter();
  const [card, setCard] = useState<ChipCardView | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setTripleCaptain(on: boolean) {
    if (!team) {
      router.push("/pick");
      return;
    }
    setBusy(true);
    const result = await submitTeamAction(matchdayId, {
      playerIds: team.playerIds,
      captainPlayerId: team.captainPlayerId,
      viceCaptainPlayerId: team.viceCaptainPlayerId,
      expectedVersion: team.teamVersion,
      acknowledgedPenalty: 0,
      chipCode: on ? "triple_captain" : null,
      reservePlayerIds: [],
    });
    setBusy(false);
    setOpen(false);
    if (result.ok === false) {
      appToast.error(result.message);
      return;
    }
    appToast.success(on ? "Triple Captain activated" : "Chip cancelled");
    router.refresh();
  }

  function goToSquadEditor(code?: ChipCode) {
    setOpen(false);
    router.push(code ? `/pick?chip=${code}` : "/pick");
  }

  const active = chips.activeChipCode;

  return (
    <div className="space-y-3">
      <ChipRail
        chips={chips.chips}
        onSelectChip={(c) => {
          if (c.code === "bench_boost") {
            // Instant flow: jump to the squad editor, which asks for the extras.
            goToSquadEditor("bench_boost");
            return;
          }
          setCard(c);
          setOpen(true);
        }}
      />
      {active ? <ActiveChipBanner chipCode={active} readOnly /> : null}
      <ChipDetailDrawer
        open={open}
        onClose={() => setOpen(false)}
        card={card}
        activating={busy}
        onContinueToTeam={(code) => goToSquadEditor(code)}
        onActivateTripleCaptain={() => void setTripleCaptain(true)}
        onCancelChip={
          card?.code === "triple_captain"
            ? () => void setTripleCaptain(false)
            : () => goToSquadEditor()
        }
      />
    </div>
  );
}

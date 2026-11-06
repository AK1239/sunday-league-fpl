import type { ChipCode } from "./registry";

export type ChipPermanencePill =
  | "Score only"
  | "Permanent squad"
  | "This gameweek only";

export type ChipUiCopy = {
  effectLine: string;
  permanencePill: ChipPermanencePill;
  bullets: readonly string[];
  transferNote: string;
  risks: string;
};

export const CHIP_UI_COPY: Record<ChipCode, ChipUiCopy> = {
  triple_captain: {
    effectLine: "Your captain scores ×3 this gameweek.",
    permanencePill: "Score only",
    bullets: [
      "Applies to your captain only if they attend.",
      "If your captain misses, vice gets the normal ×2 — the chip is wasted.",
      "One use per season; one chip per gameweek.",
    ],
    transferNote: "Normal transfer rules apply.",
    risks: "If your captain doesn't play, Triple Captain is lost with no refund.",
  },
  wildcard: {
    effectLine: "Unlimited free transfers — your new squad is permanent.",
    permanencePill: "Permanent squad",
    bullets: [
      "Make as many changes as you like with no −4 hits.",
      "Your submitted squad becomes next week's base.",
      "Free-transfer bank is preserved after the gameweek.",
    ],
    transferNote: "All changes are free; confirm on the Team tab.",
    risks: "Can't be undone after the deadline. Uses your only Wildcard this season.",
  },
  free_hit: {
    effectLine: "Temporary squad for this gameweek only.",
    permanencePill: "This gameweek only",
    bullets: [
      "Pick any five active players — not counted as transfers.",
      "Your permanent squad returns automatically next gameweek.",
      "Captain and vice apply to the temporary team only.",
    ],
    transferNote: "No transfer rows; build on the Team tab then confirm.",
    risks: "Pending permanent changes for this week are discarded when you activate.",
  },
  bench_boost: {
    effectLine: "Your reserve scores ×1 this gameweek.",
    permanencePill: "Score only",
    bullets: [
      "Choose one active player outside your five.",
      "Reserve cannot be captain or vice.",
      "Reserve is not carried to future gameweeks.",
    ],
    transferNote: "Normal transfer rules apply; pick a reserve on the Team tab.",
    risks: "If your reserve doesn't attend, the chip is wasted.",
  },
};

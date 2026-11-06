/** Canonical chip codes (validated in app; stored as text in DB). */
export const CHIP_CODES = [
  "triple_captain",
  "wildcard",
  "free_hit",
  "bench_boost",
] as const;

export type ChipCode = (typeof CHIP_CODES)[number];

export type ChipPermanence =
  "score_only" | "permanent_squad" | "temporary_squad";

export type ChipRegistryEntry = {
  code: ChipCode;
  label: string;
  permanence: ChipPermanence;
  /** Requires transfer mode + existing base squad (not initial build). */
  requiresTransferBase: boolean;
  requiresReserve: boolean;
  requiresTemporarySquad: boolean;
  setsUnlimitedTransfers: boolean;
  defaultParams: Record<string, unknown>;
};

export const CHIP_REGISTRY: Record<ChipCode, ChipRegistryEntry> = {
  triple_captain: {
    code: "triple_captain",
    label: "Triple Captain",
    permanence: "score_only",
    requiresTransferBase: false,
    requiresReserve: false,
    requiresTemporarySquad: false,
    setsUnlimitedTransfers: false,
    defaultParams: { multiplier: 3 },
  },
  wildcard: {
    code: "wildcard",
    label: "Wildcard",
    permanence: "permanent_squad",
    requiresTransferBase: true,
    requiresReserve: false,
    requiresTemporarySquad: false,
    setsUnlimitedTransfers: true,
    defaultParams: {},
  },
  free_hit: {
    code: "free_hit",
    label: "Free Hit",
    permanence: "temporary_squad",
    requiresTransferBase: true,
    requiresReserve: false,
    requiresTemporarySquad: true,
    setsUnlimitedTransfers: true,
    defaultParams: {},
  },
  bench_boost: {
    code: "bench_boost",
    label: "Bench Boost",
    permanence: "score_only",
    requiresTransferBase: false,
    requiresReserve: true,
    requiresTemporarySquad: false,
    setsUnlimitedTransfers: false,
    defaultParams: {},
  },
};

export function isChipCode(value: string): value is ChipCode {
  return (CHIP_CODES as readonly string[]).includes(value);
}

export function getChipEntry(code: ChipCode): ChipRegistryEntry {
  return CHIP_REGISTRY[code];
}

export function chipSetsUnlimitedTransfers(code: ChipCode | null): boolean {
  if (!code) return false;
  return CHIP_REGISTRY[code].setsUnlimitedTransfers;
}

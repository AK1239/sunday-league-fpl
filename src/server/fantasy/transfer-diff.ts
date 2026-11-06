/** Symmetric squad diff — transfer count is |next \\ base|, not API call count. */
export type SquadDiff = {
  /** Players removed from the base squad. */
  out: string[];
  /** Players added vs the base squad. */
  in: string[];
  /** Number of transfers (= out.length = in.length for valid squads). */
  made: number;
};

export function diffSquads(
  base: readonly string[],
  next: readonly string[],
): SquadDiff {
  const baseSet = new Set(base);
  const nextSet = new Set(next);
  const out = base.filter((id) => !nextSet.has(id));
  const inn = next.filter((id) => !baseSet.has(id));
  return { out, in: inn, made: inn.length };
}

/** Pair outs with ins by index for display (order is not authoritative). */
export function pairTransferSlots(
  diff: SquadDiff,
): { playerOutId: string; playerInId: string }[] {
  const len = Math.min(diff.out.length, diff.in.length);
  return Array.from({ length: len }, (_, i) => ({
    playerOutId: diff.out[i]!,
    playerInId: diff.in[i]!,
  }));
}

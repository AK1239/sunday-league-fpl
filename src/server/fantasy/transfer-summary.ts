import { diffSquads } from "./transfer-diff";

export type TransferWindowSummary = {
  made: number;
  freeAvailable: number;
  extra: number;
  /** Non-positive points to apply on the manager score (0 or −4, −8, …). */
  transferPenalty: number;
};

export function summariseTransferWindow(input: {
  baseSquad: readonly string[];
  nextSquad: readonly string[];
  freeAvailable: number;
  penaltyPerExtra: number;
  unlimited?: boolean;
}): TransferWindowSummary {
  const { made } = diffSquads(input.baseSquad, input.nextSquad);
  const extra = input.unlimited
    ? 0
    : Math.max(0, made - input.freeAvailable);
  const transferPenalty =
    extra === 0 ? 0 : -extra * input.penaltyPerExtra;

  return {
    made,
    freeAvailable: input.freeAvailable,
    extra,
    transferPenalty,
  };
}

/** Server-side penalty acknowledgement check (§3.4 rule 7). */
export function isPenaltyAcknowledged(
  summary: TransferWindowSummary,
  acknowledgedPenalty: number,
): boolean {
  if (summary.extra === 0) return true;
  const expected = -summary.transferPenalty;
  return acknowledgedPenalty >= expected;
}

export type FreeTransferRules = {
  /** Free transfers granted each non-cancelled matchday (default 2). */
  grant: number;
  /** Maximum bank going into a matchday (default 3). */
  cap: number;
  /** Points lost per extra transfer (default 4). */
  penaltyPerExtra: number;
};

export type MatchdayBalanceInput = {
  /** Stable key for tests / logging. */
  key: string;
  /** Cancelled matchdays are skipped — no grant, no use, carry unchanged. */
  cancelled?: boolean;
  transfersMade: number;
  /** Admin adjustment added to A_m for this matchday only (default 0). */
  adjustment?: number;
  /** Wildcard / chip: extra = 0 and carry after window = base_m (allowance preserved). */
  unlimited?: boolean;
};

export type MatchdayBalanceStep = {
  key: string;
  skipped: boolean;
  /** min(cap, carry_{m-1} + grant) before adjustments. */
  baseAvailable: number;
  /** A_m = baseAvailable + adjustment. */
  available: number;
  made: number;
  extra: number;
  /** Positive magnitude (4 per extra); apply as −penalty on score. */
  penalty: number;
  /** Carry into the next transfer-eligible matchday. */
  carry: number;
};

const DEFAULT_RULES: FreeTransferRules = {
  grant: 2,
  cap: 3,
  penaltyPerExtra: 4,
};

/**
 * Walk transfer-eligible matchdays in order and compute free-transfer economics (§3.3).
 * `initialCarry` is 0 at chain start (first transfer-eligible matchday after initial build).
 */
export function computeBalanceChain(
  matchdays: readonly MatchdayBalanceInput[],
  rules: FreeTransferRules = DEFAULT_RULES,
  initialCarry = 0,
): MatchdayBalanceStep[] {
  const steps: MatchdayBalanceStep[] = [];
  let carry = initialCarry;

  for (const md of matchdays) {
    if (md.cancelled) {
      steps.push({
        key: md.key,
        skipped: true,
        baseAvailable: 0,
        available: 0,
        made: 0,
        extra: 0,
        penalty: 0,
        carry,
      });
      continue;
    }

    const baseAvailable = Math.min(rules.cap, carry + rules.grant);
    const available = baseAvailable + (md.adjustment ?? 0);
    const made = md.transfersMade;
    const extra = md.unlimited ? 0 : Math.max(0, made - available);
    const penalty = extra * rules.penaltyPerExtra;

    if (md.unlimited) {
      carry = baseAvailable;
    } else {
      carry = Math.max(0, available - made);
    }

    steps.push({
      key: md.key,
      skipped: false,
      baseAvailable,
      available,
      made,
      extra,
      penalty,
      carry,
    });
  }

  return steps;
}

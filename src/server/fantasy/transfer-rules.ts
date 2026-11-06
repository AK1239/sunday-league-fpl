/** Season-scoped transfer economy config (from `scoring_rule_sets`). */
export type SeasonTransferRules = {
  /** Transfers enabled from this matchday number onward; null = legacy pick-any-five mode. */
  transfersStartMatchday: number | null;
  grant: number;
  cap: number;
  penaltyPerExtra: number;
};

export type TransferRuleSetRow = {
  transfersStartMatchday: number | null;
  freeTransfersPerMatchday: number;
  maxBankedFreeTransfers: number;
  extraTransferPenalty: number;
};

export function seasonTransferRulesFromRow(
  row: TransferRuleSetRow,
): SeasonTransferRules {
  return {
    transfersStartMatchday: row.transfersStartMatchday,
    grant: row.freeTransfersPerMatchday,
    cap: row.maxBankedFreeTransfers,
    penaltyPerExtra: row.extraTransferPenalty,
  };
}

export function isTransferModeEnabled(
  transfersStartMatchday: number | null,
): boolean {
  return transfersStartMatchday != null;
}

export function transferRulesApplyToMatchday(
  rules: SeasonTransferRules,
  matchdayNumber: number,
): boolean {
  if (rules.transfersStartMatchday == null) return false;
  return matchdayNumber >= rules.transfersStartMatchday;
}

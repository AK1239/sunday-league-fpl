import { describe, expect, it } from "vitest";
import {
  isTransferModeEnabled,
  seasonTransferRulesFromRow,
  transferRulesApplyToMatchday,
} from "./transfer-rules";

describe("transfer-rules", () => {
  it("treats null start matchday as transfers off", () => {
    const rules = seasonTransferRulesFromRow({
      transfersStartMatchday: null,
      freeTransfersPerMatchday: 2,
      maxBankedFreeTransfers: 3,
      extraTransferPenalty: 4,
    });
    expect(isTransferModeEnabled(rules.transfersStartMatchday)).toBe(false);
    expect(transferRulesApplyToMatchday(rules, 3)).toBe(false);
  });

  it("applies from the configured matchday number onward", () => {
    const rules = seasonTransferRulesFromRow({
      transfersStartMatchday: 3,
      freeTransfersPerMatchday: 2,
      maxBankedFreeTransfers: 3,
      extraTransferPenalty: 4,
    });
    expect(transferRulesApplyToMatchday(rules, 2)).toBe(false);
    expect(transferRulesApplyToMatchday(rules, 3)).toBe(true);
  });
});

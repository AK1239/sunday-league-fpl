"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { toastActionResult } from "@/lib/app-toast";
import { recalculateMatchdayAction } from "@/server/actions/matchday-publish";
import type { ScoringInspectorData } from "@/server/domain/scoring-inspector";
import { Button } from "@/components/ui/button";

export function MatchdayInspectorClient({
  initial,
}: {
  initial: ScoringInspectorData;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleRecalculate() {
    setBusy(true);
    const result = await recalculateMatchdayAction(initial.matchdayId);
    setBusy(false);
    if (!toastActionResult(result, "Scores recalculated")) return;
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {initial.status === "published" ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleRecalculate}
          >
            {busy ? "Recalculating…" : "Recalculate scores"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Idempotent — rebuilds ledger and manager lines from match data.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Publish this matchday to populate scoring tables.
        </p>
      )}

      <section>
        <SectionHeading title="Manager totals" />
        {initial.managerTotals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No manager scores yet.</p>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Total</th>
                  <th className="px-4 py-3 font-medium">Chip</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Squad</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Hit</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Bonus</th>
                  <th className="px-4 py-3 font-medium">Captain mult.</th>
                  <th className="px-4 py-3 font-medium">Team source</th>
                </tr>
              </thead>
              <tbody>
                {initial.managerTotals.map((row) => (
                  <tr key={row.managerId} className="border-b border-border/40">
                    <td className="px-4 py-2.5">{row.managerName}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium">
                      {row.totalPoints}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">
                      {row.chipCode?.replaceAll("_", " ") ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.squadPoints}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.transferPenalty}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {row.chipBonus > 0 ? `+${row.chipBonus}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {row.multiplierPlayerName ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">
                      {row.teamSource.replaceAll("_", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Manager score lines" />
        {initial.managerLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines yet.</p>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Base</th>
                  <th className="px-4 py-3 font-medium tabular-nums">×</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Pts</th>
                  <th className="px-4 py-3 font-medium">Attended</th>
                </tr>
              </thead>
              <tbody>
                {initial.managerLines.map((line, index) => (
                  <tr
                    key={`${line.managerId}-${line.playerId}-${index}`}
                    className="border-b border-border/40"
                  >
                    <td className="px-4 py-2">{line.managerName}</td>
                    <td className="px-4 py-2">{line.playerName}</td>
                    <td
                      className={
                        "px-4 py-2 capitalize " +
                        (line.role === "reserve"
                          ? "font-medium text-primary"
                          : "")
                      }
                    >
                      {line.role}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{line.basePoints}</td>
                    <td className="px-4 py-2 tabular-nums">{line.multiplier}</td>
                    <td className="px-4 py-2 tabular-nums font-medium">
                      {line.points}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {line.attended ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Player point ledger" />
        {initial.playerLedger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium tabular-nums">Points</th>
                </tr>
              </thead>
              <tbody>
                {initial.playerLedger.map((line) => (
                  <tr key={line.id} className="border-b border-border/40">
                    <td className="px-4 py-2">{line.playerName}</td>
                    <td className="px-4 py-2 capitalize text-muted-foreground">
                      {line.kind.replaceAll("_", " ")}
                    </td>
                    <td className="px-4 py-2 tabular-nums font-medium">
                      {line.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

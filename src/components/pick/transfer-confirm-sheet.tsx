"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { TransferSummaryStrip } from "@/components/pick/transfer-summary-strip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TransferWindowSummary } from "@/server/fantasy/transfer-summary";
import { pairTransferSlots, diffSquads } from "@/server/fantasy/transfer-diff";

export function TransferConfirmSheet({
  open,
  onClose,
  onConfirm,
  confirming,
  basePlayerIds,
  plannedPlayerIds,
  summary,
  playerNameById,
  playerKitKeyById,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (acknowledgedPenalty: number) => void;
  confirming: boolean;
  basePlayerIds: readonly string[];
  plannedPlayerIds: readonly string[];
  summary: TransferWindowSummary;
  playerNameById: Map<string, string>;
  playerKitKeyById: Map<string, string | null>;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const penaltyMagnitude = summary.extra > 0 ? -summary.transferPenalty : 0;
  const pairs = pairTransferSlots(diffSquads(basePlayerIds, plannedPlayerIds));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Confirm transfers"
      description="Review changes before the deadline locks your team."
    >
      <div className="space-y-4 pt-1">
        <TransferSummaryStrip summary={summary} />

        {pairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No player changes — only captain or vice updates will be saved.
          </p>
        ) : (
          <ul className="space-y-2">
            {pairs.map((pair) => (
              <li
                key={`${pair.playerOutId}-${pair.playerInId}`}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2"
              >
                <TransferSide
                  label="Out"
                  name={playerNameById.get(pair.playerOutId) ?? "Out"}
                  kitKey={playerKitKeyById.get(pair.playerOutId) ?? null}
                />
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <TransferSide
                  label="In"
                  name={playerNameById.get(pair.playerInId) ?? "In"}
                  kitKey={playerKitKeyById.get(pair.playerInId) ?? null}
                  highlight
                />
              </li>
            ))}
          </ul>
        )}

        {summary.extra > 0 ? (
          <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              This gameweek will cost {penaltyMagnitude} points in transfer
              hits.
            </p>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-border"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                I understand this costs {penaltyMagnitude} points on my gameweek
                score.
              </span>
            </label>
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          className={cn("w-full", summary.extra > 0 && "bg-destructive")}
          disabled={confirming || (summary.extra > 0 && !acknowledged)}
          aria-busy={confirming}
          onClick={() => onConfirm(summary.extra > 0 ? penaltyMagnitude : 0)}
        >
          {confirming
            ? "Saving…"
            : summary.extra > 0
              ? `Confirm (${penaltyMagnitude} pts)`
              : pairs.length === 0
                ? "Confirm team"
                : "Confirm transfers"}
        </Button>
      </div>
    </BottomSheet>
  );
}

function TransferSide({
  label,
  name,
  kitKey,
  highlight = false,
}: {
  label: string;
  name: string;
  kitKey: string | null;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <PlayerShirt name={name} kitKey={kitKey} size="sm" />
      <div className="min-w-0">
        <p
          className={cn(
            "text-[10px] font-semibold tracking-widest uppercase",
            highlight ? "text-primary" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
    </div>
  );
}

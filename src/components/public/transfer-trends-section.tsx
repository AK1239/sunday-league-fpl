import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { cn } from "@/lib/utils";
import type {
  PublicTransferTrends,
  TransferTrendPlayer,
} from "@/server/queries/transfer-trends";

export function TransferTrendsSection({
  trends,
}: {
  trends: PublicTransferTrends;
}) {
  return (
    <section aria-labelledby="transfer-trends" className="animate-rise">
      <SectionHeading title={`Gameweek ${trends.number} transfers`} />
      <p className="-mt-2 mb-3 text-sm text-muted-foreground tabular-nums">
        {trends.totalTransfers} transfer{trends.totalTransfers === 1 ? "" : "s"}{" "}
        by {trends.managers} manager{trends.managers === 1 ? "" : "s"} so far.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TrendList title="Most transferred in" tone="in" rows={trends.mostIn} />
        <TrendList
          title="Most transferred out"
          tone="out"
          rows={trends.mostOut}
        />
      </div>
    </section>
  );
}

function TrendList({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "in" | "out";
  rows: TransferTrendPlayer[];
}) {
  const Icon = tone === "in" ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="surface rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        <Icon
          className={cn(
            "size-4",
            tone === "in" ? "text-primary" : "text-destructive",
          )}
          aria-hidden
        />
        {title}
      </h3>
      <ul className="mt-3 space-y-1.5">
        {rows.map((row, i) => (
          <li key={row.playerId}>
            <Link
              href={`/players/${row.playerId}`}
              className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-4 text-center text-xs font-semibold text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <PlayerShirt
                name={row.displayName}
                kitKey={row.kitKey}
                size="sm"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {row.displayName}
              </span>
              <span
                className={cn(
                  "font-heading text-lg font-bold tabular-nums",
                  tone === "in" ? "text-primary" : "text-destructive",
                )}
              >
                {tone === "in" ? "+" : "−"}
                {row.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

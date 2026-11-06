import { connection } from "next/server";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { getDb } from "@/server/db";
import { getActiveSeasonRulesPublic } from "@/server/queries/public-players";

export async function RulesPanel() {
  await connection();
  const data = await getActiveSeasonRulesPublic(getDb());

  if (!data) {
    return (
      <EmptyState
        title="Rules not available"
        description="An active season with scoring rules is required."
      />
    );
  }

  const { rules } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={data.seasonName}
        title="Scoring rules"
        description="Real-player points on Sundays, plus how manager captaincy works."
      />

      <section className="surface space-y-4 rounded-2xl p-5">
        <h2 className="font-heading text-lg font-semibold">Sunday players</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <RuleRow label="Attendance" value={rules.attendancePts} />
          <RuleRow label="Win" value={rules.winPts} />
          <RuleRow label="Draw" value={rules.drawPts} />
          <RuleRow label="Goal" value={rules.goalPts} />
          <RuleRow label="Assist" value={rules.assistPts} />
          <RuleRow label="Clean sheet (GK)" value={rules.cleanSheetPts} />
        </ul>
      </section>

      <section className="surface space-y-3 rounded-2xl p-5">
        <h2 className="font-heading text-lg font-semibold">Fantasy managers</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Pick exactly 5 footballers before each gameweek deadline.</li>
          <li>
            Captain scores{" "}
            <strong className="text-foreground">{rules.captainMultiplier}×</strong>{" "}
            that player&apos;s gameweek points (including attendance, goals, etc.).
          </li>
          <li>
            Vice-captain gets {rules.captainMultiplier}× only if the captain did
            not attend that Sunday.
          </li>
          <li>
            Miss the deadline and your previous team carries over automatically.
          </li>
          <li>
            Other managers&apos; teams stay hidden until the selection deadline
            passes.
          </li>
        </ul>
      </section>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2">
      <span>{label}</span>
      <span className="font-semibold tabular-nums text-primary">+{value}</span>
    </li>
  );
}

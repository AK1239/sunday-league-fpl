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
        <p className="text-sm text-muted-foreground">
          Matches are usually around 5-a-side, but lineups can be uneven (5v4,
          4v4, etc.) — scoring uses whoever actually played each match.
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <RuleRow label="Attendance" value={rules.attendancePts} />
          <RuleRow label="Win" value={rules.winPts} />
          <RuleRow label="Draw" value={rules.drawPts} />
          <RuleRow label="Goal" value={rules.goalPts} />
          <RuleRow
            label="Hat-trick (3+ goals in one match)"
            value={rules.hatTrickPts}
          />
          <RuleRow label="Assist" value={rules.assistPts} />
          <RuleRow label="Clean sheet (GK)" value={rules.cleanSheetPts} />
          <RuleRow
            label="Penalty scored"
            value={rules.penaltyGoalPts}
          />
          <RuleRow label="Penalty saved" value={rules.penaltySavedPts} />
          <RuleRow label="Own goal" value={rules.ownGoalPts} />
          <RuleRow
            label="Handball that stops a goal"
            value={rules.handballPts}
          />
          <RuleRow
            label="Penalty missed (taker)"
            value={rules.penaltyMissedPts}
          />
        </ul>
      </section>

      <section className="surface space-y-3 rounded-2xl p-5">
        <h2 className="font-heading text-lg font-semibold">Fantasy managers</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Pick exactly 5 footballers before each gameweek deadline.</li>
          <li>
            Captain scores{" "}
            <strong className="text-foreground">
              {rules.captainMultiplier}×
            </strong>{" "}
            that player&apos;s gameweek points (including attendance, goals,
            etc.).
          </li>
          <li>
            Vice-captain scores{" "}
            <strong className="text-foreground">
              {rules.viceCaptainMultiplier}×
            </strong>{" "}
            that player&apos;s gameweek points when they play (independent of
            the captain).
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
      <span
        className={
          "font-semibold tabular-nums " +
          (value < 0 ? "text-destructive" : "text-primary")
        }
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </li>
  );
}

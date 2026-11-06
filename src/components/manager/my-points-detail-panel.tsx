import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { CaptainBadge } from "@/components/pick/captain-badge";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { getMyGameweekDetail } from "@/server/queries/manager-my-pages";

export async function MyPointsDetailPanel({
  matchdayId,
}: {
  matchdayId: string;
}) {
  await connection();
  const user = await requireUser();
  const detail = await getMyGameweekDetail(getDb(), user.userId, matchdayId);
  if (!detail) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/my/points"
        className="text-sm font-medium text-primary hover:underline"
      >
        ← My Points
      </Link>
      <PageHeader
        eyebrow={`GW${detail.matchday.number}`}
        title={`${detail.totalPoints} points`}
        description={`${detail.matchday.playedOn} · ${detail.teamSource.replaceAll("_", " ")}`}
      />

      {detail.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No score lines — you may not have had a team this gameweek.
        </p>
      ) : (
        <div className="surface overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Player</th>
                <th className="px-4 py-3 font-medium tabular-nums">Base</th>
                <th className="px-4 py-3 font-medium tabular-nums">×</th>
                <th className="px-4 py-3 font-medium tabular-nums">Pts</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.playerId} className="border-b border-border/40">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      {line.playerName}
                      {line.role === "captain" ? (
                        <CaptainBadge role="captain" />
                      ) : null}
                      {line.role === "vice_captain" ? (
                        <CaptainBadge role="vice_captain" />
                      ) : null}
                    </span>
                    {!line.attended ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (absent)
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {line.basePoints}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {line.multiplier}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">
                    {line.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/fantasy/page-header";
import { EmptyState } from "@/components/fantasy/empty-state";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import {
  getManagerMySeasonId,
  getMyCaptainPerformance,
} from "@/server/queries/manager-my-pages";

export async function MyCaptainPanel() {
  await connection();
  const user = await requireUser();
  const seasonId = await getManagerMySeasonId(getDb());
  if (!seasonId) {
    return (
      <EmptyState
        title="No active season"
        description="Captain stats need published gameweeks."
      />
    );
  }

  const { seasonBonus, gameweeks } = await getMyCaptainPerformance(
    getDb(),
    user.userId,
    seasonId,
  );

  const withBonus = gameweeks.filter((gw) => gw.captainBonusPoints > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Captaincy"
        title="Captain performance"
        description={`Extra points from captain / vice-captain multipliers this season · ${seasonBonus} pts`}
      />

      {withBonus.length === 0 ? (
        <EmptyState
          title="No captain bonus yet"
          description="When your captain or vice-captain gets a points multiplier, the extra shows here."
        />
      ) : (
        <ul className="space-y-2">
          {withBonus.map((gw) => (
            <li
              key={gw.matchdayId}
              className="surface flex items-center justify-between gap-4 rounded-2xl px-4 py-3"
            >
              <div>
                <Link
                  href={`/my/points/${gw.matchdayId}`}
                  className="font-heading font-semibold tabular-nums hover:text-primary"
                >
                  GW{gw.number}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {gw.playedOn}
                  {gw.multiplierPlayerName
                    ? ` · top multiplier: ${gw.multiplierPlayerName}`
                    : null}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-primary">
                +{gw.captainBonusPoints}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { PageHeader } from "@/components/fantasy/page-header";
import { Suspense } from "react";
import { StandingsSkeleton } from "@/components/fantasy/fantasy-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { ManagerStandingsPanel } from "@/components/public/manager-standings-panel";
import { connection } from "next/server";
import { getDb } from "@/server/db";
import { getActiveSeasonId } from "@/server/queries/public-competition";
import { seasons } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export default function ManagerTablePage({
  searchParams,
}: PageProps<"/table">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<PageHeaderSkeleton />}>
        <TablePageHeader searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<StandingsSkeleton />}>
        <ManagerStandingsPanel searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TablePageHeader({
  searchParams,
}: {
  searchParams: PageProps<"/table">["searchParams"];
}) {
  await connection();
  const params = await searchParams;
  const allTime = params.scope === "all-time";
  const seasonId = allTime ? null : await getActiveSeasonId(getDb());
  let seasonName = allTime ? "All-time" : "Season";
  if (seasonId) {
    const [season] = await getDb()
      .select({ name: seasons.name })
      .from(seasons)
      .where(eq(seasons.id, seasonId))
      .limit(1);
    seasonName = season?.name ?? seasonName;
  }

  return (
    <PageHeader
      eyebrow="Manager competition"
      title="Table"
      description={`${seasonName} · tap a manager for their profile`}
    />
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24 rounded-md" />
      <Skeleton className="h-10 w-48 rounded-xl" />
    </div>
  );
}

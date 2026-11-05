import { PageHeader } from "@/components/fantasy/page-header";
import { Suspense } from "react";
import { StandingsSkeleton } from "@/components/fantasy/fantasy-skeletons";
import { StandingsView } from "@/components/fantasy/standings-view";

export default function PlayersStandingsPage({
  searchParams,
}: PageProps<"/players">) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Real players"
        title="Player standings"
        description="Sunday performers — tap a name for their profile"
      />

      <Suspense fallback={<StandingsSkeleton />}>
        <StandingsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

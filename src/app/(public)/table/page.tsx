import { PageHeader } from "@/components/fantasy/page-header";
import { Suspense } from "react";
import { StandingsSkeleton } from "@/components/fantasy/fantasy-skeletons";
import { StandingsView } from "@/components/fantasy/standings-view";

export default function StandingsPage({ searchParams }: PageProps<"/table">) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="League"
        title="Standings"
        description="Season 1 · tap a player for their profile"
      />

      <Suspense fallback={<StandingsSkeleton />}>
        <StandingsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

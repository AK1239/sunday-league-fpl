import { Suspense } from "react";
import { StandingsSkeleton } from "@/components/fantasy/fantasy-skeletons";
import { StandingsView } from "@/components/fantasy/standings-view";

export default function StandingsPage({
  searchParams,
}: PageProps<"/table">) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Standings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Season 1 · tap a player for their profile
        </p>
      </header>

      <Suspense fallback={<StandingsSkeleton />}>
        <StandingsView searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

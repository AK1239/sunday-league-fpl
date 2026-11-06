import { FantasyPitch } from "@/components/manager/fantasy-pitch";
import { MyTeamEditablePitch } from "@/components/manager/my-team-editable-pitch";
import { EmptyTeam } from "@/components/manager/empty-team";
import type { FantasyTeamView } from "@/server/queries/fantasy-team-view";

export function sourceLabel(source: string) {
  switch (source) {
    case "carry_over":
      return "Carried over";
    case "admin":
      return "Admin override";
    case "manual":
      return "Your pick";
    default:
      return source;
  }
}

export function FantasyTeamCard({
  team,
  matchdayId,
  picksOpen = false,
  emptyTitle = "No team this gameweek",
  emptyMessage = "No lineup was saved for this gameweek.",
  emptyAction,
}: {
  team: FantasyTeamView;
  /** When set with picksOpen, tap opens captain/vice sheet instead of player profile. */
  matchdayId?: string;
  picksOpen?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: { href: string; label: string };
}) {
  if (team.visibility === "hidden") {
    return (
      <EmptyTeam
        title="Team hidden for now"
        description="Lineups are revealed once the gameweek locks, so nobody can copy a pick."
      />
    );
  }

  if (team.slots.length === 0) {
    return (
      <EmptyTeam
        title={emptyTitle}
        description={emptyMessage}
        action={emptyAction}
      />
    );
  }

  if (picksOpen && matchdayId) {
    return (
      <MyTeamEditablePitch
        matchdayId={matchdayId}
        slots={team.slots}
        teamSourceLabel={sourceLabel(team.teamSource)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {sourceLabel(team.teamSource)}
      </p>
      <FantasyPitch slots={team.slots} />
    </div>
  );
}

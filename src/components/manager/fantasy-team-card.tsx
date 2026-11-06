import { FantasyPitch } from "@/components/manager/fantasy-pitch";
import { EmptyTeam } from "@/components/manager/empty-team";
import type { FantasyTeamView } from "@/server/queries/fantasy-team-view";

function sourceLabel(source: string) {
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
  emptyTitle = "No team this gameweek",
  emptyMessage = "No lineup was saved for this gameweek.",
  emptyAction,
}: {
  team: FantasyTeamView;
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

  return (
    <div className="space-y-3">
      <p className="text-center text-xs font-medium tracking-widest text-muted-foreground uppercase">
        {sourceLabel(team.teamSource)}
      </p>
      <FantasyPitch slots={team.slots} />
    </div>
  );
}

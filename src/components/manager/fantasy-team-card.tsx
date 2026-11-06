import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { EmptyTeam } from "@/components/manager/empty-team";
import { CaptainBadge } from "@/components/pick/captain-badge";
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
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {sourceLabel(team.teamSource)}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {team.slots.map((slot) => (
          <li
            key={slot.playerId}
            className="surface flex items-center gap-3 rounded-2xl px-3 py-2.5"
          >
            <div className="relative">
              <PlayerShirt name={slot.displayName} size="md" />
              {slot.role === "captain" ? (
                <CaptainBadge
                  role="captain"
                  className="absolute -right-1 -bottom-1"
                />
              ) : null}
              {slot.role === "vice_captain" ? (
                <CaptainBadge
                  role="vice_captain"
                  className="absolute -right-1 -top-1"
                />
              ) : null}
            </div>
            <span className="text-sm font-medium">{slot.displayName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

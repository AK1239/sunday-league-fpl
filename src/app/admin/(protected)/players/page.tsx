import { CreatePlayerForm } from "@/components/admin/create-player-form";
import { PlayerRowActions } from "@/components/admin/player-row-actions";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { listPlayersAdmin } from "@/server/domain/players-admin";

export default async function AdminPlayersPage() {
  await requireAdmin();
  const players = await listPlayersAdmin(getDb());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Players</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {players.filter((p) => p.active).length} active · {players.length} total
        </p>
      </header>

      <CreatePlayerForm />

      <section aria-labelledby="player-list">
        <h2 id="player-list" className="font-heading mb-3 text-lg font-semibold">
          Squad
        </h2>
        <ul className="space-y-3">
          {players.map((player) => (
            <li
              key={player.id}
              className="rounded-xl border border-border/60 bg-card/60 p-3"
            >
              <div className="mb-2 flex items-center gap-3">
                <PlayerAvatar
                  name={player.displayName}
                  avatarUrl={player.avatarUrl ?? undefined}
                  size="md"
                />
                <div>
                  <p className="font-medium">
                    {player.displayName}
                    {!player.active ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (inactive)
                      </span>
                    ) : null}
                  </p>
                  {player.nickname ? (
                    <p className="text-sm text-muted-foreground">{player.nickname}</p>
                  ) : null}
                </div>
              </div>
              <PlayerRowActions player={player} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

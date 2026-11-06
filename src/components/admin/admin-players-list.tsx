import { PlayerRowActions } from "@/components/admin/player-row-actions";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { getDb } from "@/server/db";
import { listPlayersAdmin } from "@/server/domain/players-admin";

export async function AdminPlayersList() {
  const players = await listPlayersAdmin(getDb());

  return (
    <section aria-labelledby="player-list">
      <h2 id="player-list" className="font-heading mb-3 text-lg font-semibold">
        Squad · {players.filter((p) => p.active).length} active /{" "}
        {players.length} total
      </h2>
      <ul className="space-y-3">
        {players.map((player) => (
          <li key={player.id} className="surface animate-rise rounded-2xl p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3 sm:shrink-0">
                <PlayerAvatar
                  name={player.displayName}
                  avatarUrl={player.avatarUrl ?? undefined}
                  size="md"
                />
                {!player.active ? (
                  <span className="text-xs text-muted-foreground sm:hidden">
                    Inactive
                  </span>
                ) : null}
              </div>
              <PlayerRowActions
                player={{
                  id: player.id,
                  displayName: player.displayName,
                  active: player.active,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

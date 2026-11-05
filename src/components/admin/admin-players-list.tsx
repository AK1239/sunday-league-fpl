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
                  <p className="text-sm text-muted-foreground">
                    {player.nickname}
                  </p>
                ) : null}
              </div>
            </div>
            <PlayerRowActions player={player} />
          </li>
        ))}
      </ul>
    </section>
  );
}

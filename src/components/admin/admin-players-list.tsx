import { AdminPlayersGrid } from "@/components/admin/admin-players-grid";
import { getDb } from "@/server/db";
import { listPlayersAdmin } from "@/server/domain/players-admin";

export async function AdminPlayersList() {
  const players = await listPlayersAdmin(getDb());

  return (
    <AdminPlayersGrid
      players={players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        nickname: p.nickname,
        kitKey: p.kitKey,
        active: p.active,
      }))}
    />
  );
}

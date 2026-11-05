import { ActivateSeasonButton } from "@/components/admin/activate-season-button";
import { CreateSeasonForm } from "@/components/admin/create-season-form";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { listSeasonsAdmin } from "@/server/domain/seasons-admin";

export default async function AdminSeasonsPage() {
  await requireAdmin();
  const seasons = await listSeasonsAdmin(getDb());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Seasons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only one season can be active at a time.
        </p>
      </header>

      <CreateSeasonForm />

      <section aria-labelledby="season-list">
        <h2 id="season-list" className="font-heading mb-3 text-lg font-semibold">
          All seasons
        </h2>
        <ul className="space-y-2">
          {seasons.map((season) => (
            <li
              key={season.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{season.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {season.startsOn} → {season.endsOn} ·{" "}
                  <span className="capitalize">{season.status}</span>
                </p>
              </div>
              {season.status !== "active" && season.status !== "closed" ? (
                <ActivateSeasonButton seasonId={season.id} />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

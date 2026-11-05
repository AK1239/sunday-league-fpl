import { ActivateSeasonButton } from "@/components/admin/activate-season-button";
import { CloseSeasonButton } from "@/components/admin/close-season-button";
import { getDb } from "@/server/db";
import { listSeasonsAdmin } from "@/server/domain/seasons-admin";

export async function AdminSeasonsList() {
  const seasons = await listSeasonsAdmin(getDb());

  return (
    <section aria-labelledby="season-list">
      <h2 id="season-list" className="font-heading mb-3 text-lg font-semibold">
        All seasons
      </h2>
      <ul className="space-y-2">
        {seasons.map((season) => (
          <li
            key={season.id}
            className="surface flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{season.name}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {season.startsOn} → {season.endsOn} ·{" "}
                <span
                  className={
                    "capitalize " +
                    (season.status === "active"
                      ? "font-medium text-primary"
                      : "")
                  }
                >
                  {season.status}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {season.status === "upcoming" ? (
                <ActivateSeasonButton seasonId={season.id} />
              ) : null}
              {season.status === "active" ? (
                <CloseSeasonButton seasonId={season.id} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { ActivateSeasonButton } from "@/components/admin/activate-season-button";
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
            {season.status !== "active" && season.status !== "closed" ? (
              <ActivateSeasonButton seasonId={season.id} />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

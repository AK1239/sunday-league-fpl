import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { getAdminActivityData } from "@/server/queries/admin-activity";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function formatWhen(d: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function afterSummary(after: unknown): string {
  if (after == null || typeof after !== "object") return "—";
  const o = after as Record<string, unknown>;
  if (typeof o.surface === "string") return String(o.surface);
  if (typeof o.reason === "string") return String(o.reason).slice(0, 80);
  return "—";
}

export async function AdminActivityPanel({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    surface?: string;
    actions?: string;
  }>;
}) {
  await connection();
  await requireAdmin();

  const sp = await searchParams;
  const days = Math.min(
    90,
    Math.max(1, Number.parseInt(sp.days ?? "14", 10) || 14),
  );
  const surface =
    sp.surface === "manager" || sp.surface === "admin" ? sp.surface : "all";

  const actionParam = sp.actions?.trim();
  const actions =
    actionParam && actionParam.length > 0
      ? actionParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

  const data = await getAdminActivityData(getDb(), {
    days,
    surface,
    actions,
  });

  const maxBar = Math.max(1, ...data.loginsByDay.map((d) => d.count));

  const filterLinks = (next: { days?: number; surface?: string }) => {
    const p = new URLSearchParams();
    p.set("days", String(next.days ?? days));
    p.set("surface", next.surface ?? surface);
    if (actionParam) p.set("actions", actionParam);
    return `/admin/activity?${p.toString()}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Activity & usage"
        description="Sign-ins, sign-outs, and other audited actions. Use filters to focus on managers or admins."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Period:</span>
        {[7, 14, 30].map((d) => (
          <Link
            key={d}
            href={filterLinks({ days: d })}
            className={cn(
              buttonVariants({
                variant: days === d ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {d}d
          </Link>
        ))}
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">Audience:</span>
        {(
          [
            ["all", "All"],
            ["manager", "Managers"],
            ["admin", "Admins"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={filterLinks({ surface: key })}
            className={cn(
              buttonVariants({
                variant: surface === key ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Events (period)"
          value={String(data.summary.totalEvents)}
        />
        <StatCard label="Logins" value={String(data.summary.loginsLastPeriod)} />
        <StatCard
          label="Unique users (logins)"
          value={String(data.summary.uniqueLoginUsers)}
        />
        <StatCard
          label="Logouts"
          value={String(data.summary.logoutsLastPeriod)}
        />
      </section>

      <section className="surface rounded-2xl border border-border/60 p-5">
        <h2 className="font-heading text-lg font-semibold">Logins by day</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Count of successful sign-ins per calendar day (UTC).
        </p>
        <div className="mt-6 flex h-40 items-end gap-1 sm:gap-1.5">
          {data.loginsByDay.map((row) => (
            <div
              key={row.day}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <div
                className="w-full max-w-[14px] rounded-t bg-primary/80 sm:max-w-5"
                style={{
                  height: `${Math.max(4, (row.count / maxBar) * 100)}%`,
                  minHeight: row.count > 0 ? "8px" : "2px",
                }}
                title={`${row.day}: ${row.count}`}
              />
              <span className="hidden text-[0.6rem] text-muted-foreground sm:block">
                {row.day.slice(8)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: hover tooltips on narrow screens — bar height reflects login volume.
        </p>
      </section>

      <section className="surface rounded-2xl border border-border/60 p-5">
        <h2 className="font-heading text-lg font-semibold">Recent activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Newest first (up to 200 rows). Auth events include IP when available.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">When</th>
                <th className="pb-2 pr-3 font-medium">User</th>
                <th className="pb-2 pr-3 font-medium">Action</th>
                <th className="pb-2 pr-3 font-medium">Entity</th>
                <th className="pb-2 pr-3 font-medium">Detail</th>
                <th className="pb-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No events in this range yet. Logins and other actions will
                    appear after migration 0012 and new traffic.
                  </td>
                </tr>
              ) : (
                data.recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/40 align-top"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatWhen(row.at, "UTC")}
                    </td>
                    <td className="py-2 pr-3">
                      {row.displayName ? (
                        <>
                          <span className="font-medium">{row.displayName}</span>
                          <br />
                          <span className="text-xs text-muted-foreground">
                            {row.email}
                            {row.role ? ` · ${row.role}` : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.action}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {row.entity}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {afterSummary(row.after)}
                    </td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {row.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface rounded-2xl border border-border/60 p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

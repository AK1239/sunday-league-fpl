import {
  Activity,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  ScrollText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import {
  getAdminActivityData,
  type ActivityRow,
} from "@/server/queries/admin-activity";
import { cn } from "@/lib/utils";

type SearchParams = {
  days?: string;
  surface?: string;
  actions?: string;
  page?: string;
};

function formatWhen(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function relativeTime(d: Date): string {
  const secs = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function afterSummary(after: unknown): string | null {
  if (after == null || typeof after !== "object") return null;
  const o = after as Record<string, unknown>;
  if (typeof o.surface === "string") return o.surface;
  if (typeof o.reason === "string") return o.reason.slice(0, 80);
  return null;
}

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
};

function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]!;
  const words = action.replace(/[._]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Tone = "login" | "logout" | "other";
function actionTone(action: string): Tone {
  if (action === "auth.login") return "login";
  if (action === "auth.logout") return "logout";
  return "other";
}

const TONE_STYLES: Record<Tone, string> = {
  login: "border-primary/30 bg-primary/15 text-primary",
  logout: "border-border/60 bg-muted/50 text-muted-foreground",
  other: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

export async function AdminActivityPanel({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
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
  const requestedPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const actionParam = sp.actions?.trim();
  const actions =
    actionParam && actionParam.length > 0
      ? actionParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

  const data = await getAdminActivityData(getDb(), {
    days,
    surface,
    actions,
    page: requestedPage,
  });
  const { page, pageCount, pageSize, total } = data.pagination;

  /** Build a link that keeps the current filters. Changing a filter resets paging. */
  const link = (next: { days?: number; surface?: string; page?: number }) => {
    const p = new URLSearchParams();
    p.set("days", String(next.days ?? days));
    p.set("surface", next.surface ?? surface);
    if (actionParam) p.set("actions", actionParam);
    if ((next.page ?? 1) > 1) p.set("page", String(next.page));
    return `/admin/activity?${p.toString()}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Activity & usage"
        description="Sign-ins, sign-outs, and other audited actions. Use filters to focus on managers or admins."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <Segmented label="Period">
          {[7, 14, 30].map((d) => (
            <SegLink
              key={d}
              href={link({ days: d })}
              active={days === d}
              label={`${d} days`}
            >
              {d}d
            </SegLink>
          ))}
        </Segmented>
        <Segmented label="Audience">
          {(
            [
              ["all", "All"],
              ["manager", "Managers"],
              ["admin", "Admins"],
            ] as const
          ).map(([key, label]) => (
            <SegLink
              key={key}
              href={link({ surface: key })}
              active={surface === key}
              label={label}
            >
              {label}
            </SegLink>
          ))}
        </Segmented>
      </div>

      <section
        aria-label="Summary"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          icon={<Activity />}
          label="Events"
          value={data.summary.totalEvents}
          hint={`Last ${days} days`}
        />
        <StatCard
          icon={<LogIn />}
          label="Sign-ins"
          value={data.summary.loginsLastPeriod}
          hint={`~${(data.summary.loginsLastPeriod / days).toFixed(1)} per day`}
          accent
        />
        <StatCard
          icon={<Users />}
          label="Unique users"
          value={data.summary.uniqueLoginUsers}
          hint="Who signed in"
        />
        <StatCard
          icon={<LogOut />}
          label="Sign-outs"
          value={data.summary.logoutsLastPeriod}
          hint={`Last ${days} days`}
        />
      </section>

      <LoginsChart data={data.loginsByDay} />

      <section className="surface space-y-4 rounded-3xl border border-border/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading flex items-center gap-2 text-xl font-semibold">
              <ScrollText className="size-5 text-primary" aria-hidden />
              Recent activity
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Newest first. Sign-in events include the IP when available.
            </p>
          </div>
          {total > 0 ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
              {total}
            </p>
          ) : null}
        </div>

        {data.recent.length === 0 ? (
          <EmptyState
            icon={<ScrollText />}
            title="No activity in this range"
            description="Sign-ins and admin actions will show up here as they happen. Try a longer period."
            className="py-10"
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="space-y-2 md:hidden">
              {data.recent.map((row) => (
                <li
                  key={row.id}
                  className="rounded-2xl border border-border/50 bg-card/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <ActionBadge action={row.action} />
                    <time
                      dateTime={row.at.toISOString()}
                      className="text-xs text-muted-foreground tabular-nums"
                    >
                      {relativeTime(row.at)}
                    </time>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <UserCell row={row} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatWhen(row.at)} UTC · {row.entity}
                    {row.ipAddress ? ` · ${row.ipAddress}` : ""}
                  </p>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="pb-2.5 pr-4 font-medium">When</th>
                    <th className="pb-2.5 pr-4 font-medium">User</th>
                    <th className="pb-2.5 pr-4 font-medium">Action</th>
                    <th className="pb-2.5 pr-4 font-medium">Entity</th>
                    <th className="pb-2.5 pr-4 font-medium">Detail</th>
                    <th className="pb-2.5 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/30 align-middle transition-colors last:border-0 hover:bg-muted/20"
                    >
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <time dateTime={row.at.toISOString()}>
                          <span className="block tabular-nums">
                            {formatWhen(row.at)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(row.at)}
                          </span>
                        </time>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          <UserCell row={row} />
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <ActionBadge action={row.action} />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground capitalize">
                        {row.entity}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {afterSummary(row.after) ?? "—"}
                      </td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">
                        {row.ipAddress ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 ? (
              <Pagination
                page={page}
                pageCount={pageCount}
                hrefFor={(n) => link({ page: n })}
              />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function Segmented({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        className="inline-flex rounded-full border border-border/60 bg-card/50 p-1"
      >
        {children}
      </div>
    </div>
  );
}

function SegLink({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      aria-label={label}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="surface relative overflow-hidden rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <span
          aria-hidden
          className={cn(
            "flex size-8 items-center justify-center rounded-lg [&_svg]:size-4",
            accent
              ? "bg-primary/20 text-primary"
              : "bg-muted/60 text-muted-foreground",
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "font-heading mt-3 text-4xl leading-none font-bold tabular-nums",
          accent && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function LoginsChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 0);
  // Round the axis up to a tidy number so gridlines read nicely.
  const top = Math.max(4, Math.ceil(max / 4) * 4);
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const empty = max === 0;
  // Thin the x-axis labels on long ranges.
  const every = data.length > 21 ? 5 : data.length > 10 ? 2 : 1;

  return (
    <section className="surface rounded-3xl border border-border/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">
            Sign-ins by day
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Successful sign-ins per calendar day (UTC).
          </p>
        </div>
        {!empty ? (
          <p className="text-sm text-muted-foreground">
            Peak{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {max}
            </span>
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3">
        <div
          aria-hidden
          className="flex h-44 flex-col justify-between text-right text-[0.65rem] text-muted-foreground tabular-nums"
        >
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {Number.isInteger(t) ? t : ""}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 flex h-44 flex-col justify-between"
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="border-t border-dashed border-border/40"
              />
            ))}
          </div>
          {empty ? (
            <div className="absolute inset-x-0 top-0 flex h-44 items-center justify-center">
              <p className="rounded-full border border-border/60 bg-background/80 px-4 py-1.5 text-sm text-muted-foreground">
                No sign-ins in this period
              </p>
            </div>
          ) : null}
          <ol className="relative flex h-44 items-end gap-1 sm:gap-1.5">
            {data.map((row, i) => (
              <li
                key={row.day}
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center"
              >
                <div
                  className={cn(
                    "w-full max-w-6 rounded-t-md transition-colors",
                    row.count > 0
                      ? "bg-gradient-to-t from-primary/60 to-primary group-hover:to-primary"
                      : "bg-border/50",
                  )}
                  style={{
                    height:
                      row.count > 0
                        ? `${Math.max(6, (row.count / top) * 100)}%`
                        : "2px",
                  }}
                />
                <span
                  role="tooltip"
                  className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-lg ring-1 ring-border transition-opacity group-hover:opacity-100"
                >
                  {row.day.slice(5).replace("-", "/")} · {row.count}
                </span>
                <span className="sr-only">
                  {row.day}: {row.count} sign-ins
                </span>
                {i % every === 0 ? (
                  <span
                    aria-hidden
                    className="absolute top-[calc(100%+0.4rem)] left-1/2 -translate-x-1/2 text-[0.65rem] text-muted-foreground tabular-nums"
                  >
                    {row.day.slice(8)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="h-6" aria-hidden />
        </div>
      </div>
    </section>
  );
}

function ActionBadge({ action }: { action: string }) {
  const tone = actionTone(action);
  return (
    <span
      title={action}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        TONE_STYLES[tone],
      )}
    >
      {tone === "login" ? (
        <LogIn className="size-3" aria-hidden />
      ) : tone === "logout" ? (
        <LogOut className="size-3" aria-hidden />
      ) : (
        <Activity className="size-3" aria-hidden />
      )}
      {actionLabel(action)}
    </span>
  );
}

function UserCell({ row }: { row: ActivityRow }) {
  if (!row.displayName) {
    return <span className="text-muted-foreground">System</span>;
  }
  return (
    <>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
      >
        {row.displayName.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{row.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {row.email}
          {row.role ? ` · ${row.role}` : ""}
        </span>
      </span>
    </>
  );
}

/** 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  const edge =
    "inline-flex h-9 items-center gap-1 rounded-full border border-border/60 bg-card/50 px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <nav
      aria-label="Activity pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            rel="prev"
            className={cn(edge, "hover:border-primary/40")}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </Link>
        ) : (
          <span aria-disabled className={cn(edge, "opacity-40")}>
            <ChevronLeft className="size-4" aria-hidden />
            Prev
          </span>
        )}
        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, pageCount).map((n, i) =>
            n === "gap" ? (
              <span
                key={`gap-${i}`}
                aria-hidden
                className="px-1 text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Link
                key={n}
                href={hrefFor(n)}
                aria-current={n === page ? "page" : undefined}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  n === page
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {n}
              </Link>
            ),
          )}
        </div>
        {page < pageCount ? (
          <Link
            href={hrefFor(page + 1)}
            rel="next"
            className={cn(edge, "hover:border-primary/40")}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span aria-disabled className={cn(edge, "opacity-40")}>
            Next
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

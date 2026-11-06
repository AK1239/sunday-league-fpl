import Link from "next/link";
import { connection } from "next/server";
import { AdminTransferRulesForm } from "@/components/admin/admin-transfer-rules-form";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import {
  getAdminTransfersPageData,
  getManagerTransferAdminDetail,
} from "@/server/queries/admin-transfers-page";
import { cn } from "@/lib/utils";

export async function AdminTransfersPanel({
  searchParams,
}: {
  searchParams: Promise<{
    matchdayId?: string;
    penalised?: string;
    managerId?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;

  const data = await getAdminTransfersPageData(getDb(), {
    matchdayId: params.matchdayId,
    penalisedOnly: params.penalised === "1",
    managerId: params.managerId,
  });

  if (!data) {
    return (
      <EmptyState
        title="No active season"
        description="Activate a season to manage transfers."
      />
    );
  }

  const managerDetail = params.managerId
    ? await getManagerTransferAdminDetail(
        getDb(),
        data.seasonId,
        params.managerId,
      )
    : null;

  const rules = data.transferRules;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Transfers"
        description="Season transfer rules, activity, and penalties."
      />

      {rules ? (
        <AdminTransferRulesForm
          seasonId={data.seasonId}
          ruleSetId={rules.ruleSetId}
          transfersStartMatchday={rules.transfersStartMatchday}
          freeTransfersPerMatchday={rules.freeTransfersPerMatchday}
          maxBankedFreeTransfers={rules.maxBankedFreeTransfers}
          extraTransferPenalty={rules.extraTransferPenalty}
          editMode={rules.editMode}
          minStartGameweek={rules.minStartGameweek}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Filters</h2>
        <form method="get" className="flex flex-wrap gap-2">
          <select
            name="matchdayId"
            defaultValue={params.matchdayId ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All gameweeks</option>
            {data.matchdays.map((m) => (
              <option key={m.id} value={m.id}>
                GW{m.number}
              </option>
            ))}
          </select>
          <select
            name="managerId"
            defaultValue={params.managerId ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All managers</option>
            {data.managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-md border border-input px-3 text-sm">
            <input
              type="checkbox"
              name="penalised"
              value="1"
              defaultChecked={params.penalised === "1"}
            />
            Penalised only
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Apply
          </button>
          <Link
            href="/admin/transfers"
            className="rounded-md border border-input px-4 py-2 text-sm"
          >
            Clear
          </Link>
        </form>
      </section>

      {data.penaltyReport.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">Penalty report</h2>
          <ul className="surface divide-y divide-border/50 rounded-2xl">
            {data.penaltyReport.map((row) => (
              <li
                key={row.managerId}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <Link
                  href={`/admin/transfers?managerId=${row.managerId}`}
                  className="font-medium hover:underline"
                >
                  {row.managerName}
                </Link>
                <span className="tabular-nums text-destructive">
                  {row.totalPenalty} pts · {row.windows} GW
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {managerDetail && managerDetail.windows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            {managerDetail.managerName} · windows
          </h2>
          <ul className="surface divide-y divide-border/50 rounded-2xl text-sm">
            {managerDetail.windows.map((w) => (
              <li
                key={w.matchdayId}
                className="flex justify-between px-4 py-2 tabular-nums"
              >
                <span>GW{w.matchdayNumber}</span>
                <span>
                  {w.made} made · {w.freeAvailable} free · penalty {w.penalty}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Activity</h2>
        {data.activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transfer windows recorded yet.
          </p>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Manager</th>
                  <th className="px-3 py-2">GW</th>
                  <th className="px-3 py-2 tabular-nums">Free</th>
                  <th className="px-3 py-2 tabular-nums">Made</th>
                  <th className="px-3 py-2 tabular-nums">Extra</th>
                  <th className="px-3 py-2 tabular-nums">Penalty</th>
                </tr>
              </thead>
              <tbody>
                {data.activity.map((row) => (
                  <tr
                    key={`${row.managerId}-${row.matchdayId}`}
                    className={cn(
                      "border-b border-border/40",
                      row.voided && "opacity-60",
                    )}
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/transfers?managerId=${row.managerId}`}
                        className="hover:underline"
                      >
                        {row.managerName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.matchdayNumber}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.freeAvailable}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.made}</td>
                    <td className="px-3 py-2 tabular-nums">{row.extra}</td>
                    <td
                      className={cn(
                        "px-3 py-2 tabular-nums font-medium",
                        row.penalty < 0 && "text-destructive",
                      )}
                    >
                      {row.penalty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

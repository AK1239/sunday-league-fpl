import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { AdminChipsClient } from "@/components/admin/admin-chips-client";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PageHeader } from "@/components/fantasy/page-header";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { getAdminChipsPageData } from "@/server/queries/admin-chips-page";
import { cn } from "@/lib/utils";

export async function AdminChipsPanel({
  searchParams,
}: {
  searchParams: Promise<{
    chipCode?: string;
    matchdayId?: string;
    managerId?: string;
    status?: string;
  }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;

  const statusFilter =
    params.status === "active" || params.status === "void"
      ? params.status
      : undefined;

  const data = await getAdminChipsPageData(getDb(), {
    chipCode: params.chipCode,
    matchdayId: params.matchdayId,
    managerId: params.managerId,
    status: statusFilter,
  });

  if (!data) {
    return (
      <EmptyState
        title="No active season"
        description="Activate a season to manage chips."
      />
    );
  }

  const filterBase = "/admin/chips";

  function filterHref(patch: Record<string, string | undefined>) {
    const q = new URLSearchParams();
    const merged = {
      chipCode: params.chipCode,
      matchdayId: params.matchdayId,
      managerId: params.managerId,
      status: params.status,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) q.set(k, v);
    }
    const s = q.toString();
    return s ? `${filterBase}?${s}` : filterBase;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Chips"
        description={`${data.seasonName} — usage, configuration, and corrections.`}
      />

      {!data.chipsEnabled ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Chips are not enabled for this season. Use{" "}
          <Link href="/admin/seasons" className="font-medium text-primary hover:underline">
            Seasons → Enable chips
          </Link>{" "}
          first.
        </p>
      ) : null}

      <nav
        className="flex flex-wrap gap-2 text-sm"
        aria-label="Filter chip usage"
      >
        <FilterLink
          href={filterHref({ status: undefined, chipCode: undefined, matchdayId: undefined, managerId: undefined })}
          active={!params.status && !params.chipCode && !params.matchdayId}
        >
          All
        </FilterLink>
        <FilterLink
          href={filterHref({ status: "active" })}
          active={params.status === "active"}
        >
          Active
        </FilterLink>
        <FilterLink
          href={filterHref({ status: "void" })}
          active={params.status === "void"}
        >
          Voided
        </FilterLink>
      </nav>

      <AdminChipsClient data={data} />
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { auditLog, users } from "@/server/db/schema";

export type AdminActivityFilters = {
  days?: number;
  /** Subset of audit_log.action values; empty = all */
  actions?: string[];
  /** Filter by actor role (from users join). */
  surface?: "all" | "manager" | "admin";
};

export type ActivityRow = {
  id: string;
  at: Date;
  action: string;
  entity: string;
  userId: string | null;
  displayName: string | null;
  email: string | null;
  role: "manager" | "admin" | null;
  ipAddress: string | null;
  userAgent: string | null;
  after: unknown;
};

export type AdminActivityData = {
  summary: {
    totalEvents: number;
    loginsLastPeriod: number;
    uniqueLoginUsers: number;
    logoutsLastPeriod: number;
  };
  loginsByDay: { day: string; count: number }[];
  recent: ActivityRow[];
};

function periodStart(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function dayKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function surfaceRoleFilter(
  surface: AdminActivityFilters["surface"],
): ReturnType<typeof eq> | ReturnType<typeof or> | undefined {
  if (surface === "manager") {
    return or(eq(users.role, "manager"), isNull(auditLog.userId));
  }
  if (surface === "admin") {
    return eq(users.role, "admin");
  }
  return undefined;
}

export async function getAdminActivityData(
  db: AppDb,
  filters: AdminActivityFilters = {},
): Promise<AdminActivityData> {
  const days = Math.min(Math.max(filters.days ?? 14, 1), 90);
  const since = periodStart(days);
  const surface = filters.surface ?? "all";
  const actionFilter = filters.actions?.length ? filters.actions : null;
  const roleFilter = surfaceRoleFilter(surface);

  const periodCond = gte(auditLog.at, since);
  const actionCond =
    actionFilter && actionFilter.length > 0
      ? inArray(auditLog.action, actionFilter)
      : undefined;

  const listWhereParts = [periodCond, actionCond, roleFilter].filter(
    (x): x is NonNullable<typeof x> => x != null,
  );
  const listWhere = and(...listWhereParts);

  const [countRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(listWhere);

  const loginWhereParts = [
    periodCond,
    eq(auditLog.action, "auth.login"),
    roleFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const loginWhere = and(...loginWhereParts);

  const [loginCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(loginWhere);

  const distinctWhereParts = [
    periodCond,
    eq(auditLog.action, "auth.login"),
    sql`${auditLog.userId} is not null`,
    roleFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const distinctWhere = and(...distinctWhereParts);

  const distinctLoginUsers = await db
    .selectDistinct({ userId: auditLog.userId })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(distinctWhere);

  const logoutWhereParts = [
    periodCond,
    eq(auditLog.action, "auth.logout"),
    roleFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const logoutWhere = and(...logoutWhereParts);

  const [logoutCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(logoutWhere);

  const loginRows = await db
    .select({ at: auditLog.at })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(loginWhere);

  const byDay = new Map<string, number>();
  for (const row of loginRows) {
    const at = row.at instanceof Date ? row.at : new Date(String(row.at));
    const k = dayKeyUtc(at);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }

  const loginsByDay: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(12, 0, 0, 0);
    const k = dayKeyUtc(d);
    loginsByDay.push({ day: k, count: byDay.get(k) ?? 0 });
  }

  const recentRows = await db
    .select({
      id: auditLog.id,
      at: auditLog.at,
      action: auditLog.action,
      entity: auditLog.entity,
      userId: auditLog.userId,
      after: auditLog.after,
      ipAddress: auditLog.ipAddress,
      userAgent: auditLog.userAgent,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(listWhere)
    .orderBy(desc(auditLog.at))
    .limit(200);

  const recent: ActivityRow[] = recentRows.map((r) => ({
    id: r.id,
    at: r.at instanceof Date ? r.at : new Date(String(r.at)),
    action: r.action,
    entity: r.entity,
    userId: r.userId,
    displayName: r.displayName,
    email: r.email,
    role: r.role,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    after: r.after,
  }));

  return {
    summary: {
      totalEvents: countRow?.c ?? 0,
      loginsLastPeriod: loginCountRow?.c ?? 0,
      uniqueLoginUsers: distinctLoginUsers.filter((x) => x.userId != null)
        .length,
      logoutsLastPeriod: logoutCountRow?.c ?? 0,
    },
    loginsByDay,
    recent,
  };
}

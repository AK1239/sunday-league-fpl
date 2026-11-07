import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import type { AppDb } from "@/server/db";
import { auditLog, users } from "@/server/db/schema";

export type AdminActivityFilters = {
  days?: number;
  /** Subset of audit_log.action values; empty = all */
  actions?: string[];
  /** Filter by actor role (from users join). */
  surface?: "all" | "manager" | "admin";
  /** 1-based page of the activity list. */
  page?: number;
  pageSize?: number;
};

export const ACTIVITY_PAGE_SIZE = 15;

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
    visitsLastPeriod: number;
    uniqueLoginUsers: number;
    uniqueActiveUsers: number;
    logoutsLastPeriod: number;
  };
  loginsByDay: { day: string; count: number }[];
  recent: ActivityRow[];
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
};

/** East Africa Time (UTC+3, no DST) — league default for activity UI. */
export const ADMIN_ACTIVITY_TIMEZONE = "Africa/Nairobi";

/** Omit these users from admin activity stats/lists (email substring, case-insensitive). */
export const ADMIN_ACTIVITY_HIDDEN_EMAIL_SUBSTRINGS = ["akil"] as const;

function hiddenActivityUserFilter() {
  const clauses = ADMIN_ACTIVITY_HIDDEN_EMAIL_SUBSTRINGS.map(
    (sub) =>
      sql`lower(coalesce(${users.email}, '')) not like ${`%${sub.toLowerCase()}%`}`,
  );
  return or(isNull(auditLog.userId), and(...clauses));
}

function formatEatYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_ACTIVITY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Start of a calendar day in EAT (fixed UTC+3), as an instant. */
function eatDayStartUtc(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+03:00`);
}

function addEatCalendarDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const mid = new Date(Date.UTC(y, m - 1, d + delta, 12, 0, 0, 0));
  return formatEatYmd(mid);
}

function periodStartEat(days: number): Date {
  const today = formatEatYmd(new Date());
  const startYmd = addEatCalendarDays(today, -days);
  return eatDayStartUtc(startYmd);
}

function dayKeyEat(d: Date): string {
  const at = d instanceof Date ? d : new Date(String(d));
  return formatEatYmd(at);
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
  const since = periodStartEat(days);
  const surface = filters.surface ?? "all";
  const actionFilter = filters.actions?.length ? filters.actions : null;
  const roleFilter = surfaceRoleFilter(surface);
  const pageSize = Math.min(
    Math.max(filters.pageSize ?? ACTIVITY_PAGE_SIZE, 5),
    100,
  );

  const periodCond = gte(auditLog.at, since);
  const actionCond =
    actionFilter && actionFilter.length > 0
      ? inArray(auditLog.action, actionFilter)
      : undefined;

  const visibilityFilter = hiddenActivityUserFilter();

  const listWhereParts = [
    periodCond,
    actionCond,
    roleFilter,
    visibilityFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
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
    visibilityFilter,
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
    visibilityFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const distinctWhere = and(...distinctWhereParts);

  const distinctLoginUsers = await db
    .selectDistinct({ userId: auditLog.userId })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(distinctWhere);

  const visitWhereParts = [
    periodCond,
    eq(auditLog.action, "auth.visit"),
    roleFilter,
    visibilityFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const visitWhere = and(...visitWhereParts);

  const [visitCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(visitWhere);

  const activeWhereParts = [
    periodCond,
    inArray(auditLog.action, ["auth.login", "auth.visit"]),
    sql`${auditLog.userId} is not null`,
    roleFilter,
    visibilityFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const activeWhere = and(...activeWhereParts);

  const distinctActiveUsers = await db
    .selectDistinct({ userId: auditLog.userId })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(activeWhere);

  const logoutWhereParts = [
    periodCond,
    eq(auditLog.action, "auth.logout"),
    roleFilter,
    visibilityFilter,
  ].filter((x): x is NonNullable<typeof x> => x != null);
  const logoutWhere = and(...logoutWhereParts);

  const [logoutCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(logoutWhere);

  const engagementWhere = and(
    periodCond,
    inArray(auditLog.action, ["auth.login", "auth.visit"]),
    roleFilter,
    visibilityFilter,
  );

  const engagementRows = await db
    .select({ at: auditLog.at })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .where(engagementWhere);

  const byDay = new Map<string, number>();
  for (const row of engagementRows) {
    const at = row.at instanceof Date ? row.at : new Date(String(row.at));
    const k = dayKeyEat(at);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }

  const loginsByDay: { day: string; count: number }[] = [];
  const todayEat = formatEatYmd(new Date());
  for (let i = days - 1; i >= 0; i--) {
    const k = addEatCalendarDays(todayEat, -(days - 1 - i));
    loginsByDay.push({ day: k, count: byDay.get(k) ?? 0 });
  }

  const total = countRow?.c ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pageCount);

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
    .limit(pageSize)
    .offset((page - 1) * pageSize);

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
      visitsLastPeriod: visitCountRow?.c ?? 0,
      uniqueLoginUsers: distinctLoginUsers.filter((x) => x.userId != null)
        .length,
      uniqueActiveUsers: distinctActiveUsers.filter((x) => x.userId != null)
        .length,
      logoutsLastPeriod: logoutCountRow?.c ?? 0,
    },
    loginsByDay,
    recent,
    pagination: { page, pageSize, pageCount, total },
  };
}

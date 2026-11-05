import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getEnv } from "@/env";
import { getDb } from "@/server/db";
import { sessions, users } from "@/server/db/schema";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./constants";
import { createSessionToken, hashSessionToken } from "./session-token";

export type UserRole = "manager" | "admin";

export type UserSession = {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
};

/** @deprecated Prefer userId on UserSession; kept for admin audit call sites. */
export type AdminSession = UserSession & { adminId: string };

function cookieOptions() {
  const secure =
    getEnv().NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export async function createUserSession(userId: string): Promise<void> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getDb().insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, cookieOptions());
}

/** @deprecated Use createUserSession */
export const createAdminSession = createUserSession;

export async function destroyUserSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  jar.set(SESSION_COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
}

/** @deprecated Use destroyUserSession */
export const destroyAdminSession = destroyUserSession;

function mapRow(row: {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
  status: "active" | "disabled";
}): UserSession | null {
  if (row.status !== "active") return null;
  return {
    userId: row.userId,
    email: row.email,
    role: row.role,
    displayName: row.displayName,
  };
}

export async function getUserSession(): Promise<UserSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const rows = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      role: users.role,
      displayName: users.displayName,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return mapRow(row);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getUserSession();
  if (!session || session.role !== "admin") return null;
  return { ...session, adminId: session.userId };
}

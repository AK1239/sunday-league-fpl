import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getEnv } from "@/env";
import { getDb } from "@/server/db";
import { adminUsers, sessions } from "@/server/db/schema";
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./constants";
import { createSessionToken, hashSessionToken } from "./session-token";

export type AdminSession = {
  adminId: string;
  email: string;
};

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

export async function createAdminSession(adminUserId: string): Promise<void> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getDb().insert(sessions).values({
    adminUserId,
    tokenHash,
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, cookieOptions());
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  jar.set(SESSION_COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const rows = await getDb()
    .select({
      adminId: adminUsers.id,
      email: adminUsers.email,
    })
    .from(sessions)
    .innerJoin(adminUsers, eq(sessions.adminUserId, adminUsers.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { adminId: row.adminId, email: row.email };
}

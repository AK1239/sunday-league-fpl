import { describe, expect, it, beforeEach, vi } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { loginWithCredentials } from "@/server/auth/login";
import { resetLoginRateLimits } from "@/server/auth/rate-limit";
import { requireUser } from "@/server/auth/require-user";
import { requireAdmin, ForbiddenError } from "@/server/auth/require-admin";
import {
  acceptManagerInvite,
  createManagerInvite,
} from "@/server/domain/invites";
import { getDb } from "@/server/db";
import { eq } from "drizzle-orm";
import { users } from "@/server/db/schema";
import { SESSION_COOKIE_NAME } from "@/server/auth/constants";
import { resetDatabase } from "./helpers";

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {}),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => undefined,
    set: vi.fn(),
  })),
}));

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("manager invites and auth", () => {
  let adminId: string;

  beforeEach(async () => {
    resetLoginRateLimits();
    await resetDatabase();
    const [admin] = await getDb()
      .insert(users)
      .values({
        email: "admin@mkate.test",
        displayName: "Admin",
        passwordHash: await hashPassword("test-password-12"),
        role: "admin",
        status: "active",
      })
      .returning({ id: users.id });
    adminId = admin.id;
  });

  it("creates a manager via invite and blocks admin-only login", async () => {
    const { token } = await createManagerInvite({
      createdByUserId: adminId,
      label: "Test Manager",
    });

    const accepted = await acceptManagerInvite({
      token,
      email: "manager@mkate.test",
      displayName: "Test Manager",
      password: "manager-pass-12",
    });
    expect(accepted.ok).toBe(true);

    const managerLogin = await loginWithCredentials(
      "manager@mkate.test",
      "manager-pass-12",
      "127.0.0.1",
      { allowedRoles: ["manager", "admin"] },
    );
    expect(managerLogin.ok).toBe(true);

    const adminOnly = await loginWithCredentials(
      "manager@mkate.test",
      "manager-pass-12",
      "127.0.0.1",
      { allowedRoles: ["admin"] },
    );
    expect(adminOnly.ok).toBe(false);
  });

  it("requireAdmin rejects managers", async () => {
    await getDb()
      .insert(users)
      .values({
        email: "mgr@mkate.test",
        displayName: "Mgr",
        passwordHash: await hashPassword("test-password-12"),
        role: "manager",
        status: "active",
      });

    const { cookies } = await import("next/headers");
    const { createUserSession } = await import("@/server/auth/session");
    const manager = await getDb()
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "mgr@mkate.test"))
      .limit(1);

    let storedToken: string | undefined;
    vi.mocked(cookies).mockImplementation(async () => {
      return {
        get: (name: string) =>
          name === SESSION_COOKIE_NAME && storedToken
            ? { value: storedToken }
            : undefined,
        set: (_name: string, value: string) => {
          storedToken = value;
        },
      } as Awaited<ReturnType<typeof cookies>>;
    });

    await createUserSession(manager[0]!.id);

    await expect(requireAdmin()).rejects.toBeInstanceOf(ForbiddenError);
    await expect(requireUser()).resolves.toMatchObject({
      email: "mgr@mkate.test",
      role: "manager",
    });
  });
});

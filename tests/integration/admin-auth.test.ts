import { describe, expect, it, beforeEach, vi } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { loginWithCredentials } from "@/server/auth/login";
import { resetLoginRateLimits } from "@/server/auth/rate-limit";
import { requireAdmin, UnauthorizedError } from "@/server/auth/require-admin";
import { createPlayerAction } from "@/server/actions/players";
import { getDb } from "@/server/db";
import { adminUsers } from "@/server/db/schema";
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

describe.skipIf(!hasDatabase)("admin auth", () => {
  beforeEach(async () => {
    resetLoginRateLimits();
    await resetDatabase();
    await getDb()
      .insert(adminUsers)
      .values({
        email: "admin@mkate.test",
        passwordHash: await hashPassword("test-password-12"),
      });
  });

  it("rejects invalid credentials", async () => {
    const result = await loginWithCredentials(
      "admin@mkate.test",
      "wrong-password",
      "127.0.0.1",
    );
    expect(result.ok).toBe(false);
  });

  it("accepts valid credentials", async () => {
    const result = await loginWithCredentials(
      "admin@mkate.test",
      "test-password-12",
      "127.0.0.1",
    );
    expect(result.ok).toBe(true);
  });

  it("requireAdmin throws without a session cookie", async () => {
    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("createPlayerAction rejects unauthenticated calls", async () => {
    const formData = new FormData();
    formData.set("displayName", "Intruder FC");
    await expect(createPlayerAction(formData)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});

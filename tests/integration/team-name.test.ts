import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/server/db";
import { seedDatabase } from "@/server/db/seed";
import { users } from "@/server/db/schema";
import {
  getTeamName,
  setTeamName,
  TeamNameError,
} from "@/server/domain/team-name";
import { getPublicManagerProfile } from "@/server/queries/public-competition";
import { resetDatabase } from "./helpers";

const hasDatabase = !!process.env.DATABASE_URL;

async function makeManager(email: string, displayName: string) {
  const [row] = await getDb()
    .insert(users)
    .values({
      email,
      displayName,
      passwordHash: "x",
      role: "manager",
      status: "active",
    })
    .returning();
  return row!.id;
}

describe.skipIf(!hasDatabase)("team name", () => {
  let a: string;
  let b: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedDatabase();
    a = await makeManager("a@test.local", "Alice");
    b = await makeManager("b@test.local", "Bob");
  });

  it("starts empty, then saves a normalised name", async () => {
    const db = getDb();
    expect(await getTeamName(db, a)).toBeNull();
    expect(await setTeamName(db, a, "  Sunday   Wolves ")).toBe(
      "Sunday Wolves",
    );
    expect(await getTeamName(db, a)).toBe("Sunday Wolves");
  });

  it("lets a manager rename their own team", async () => {
    const db = getDb();
    await setTeamName(db, a, "First");
    await setTeamName(db, a, "Second");
    expect(await getTeamName(db, a)).toBe("Second");
    // Re-saving the same name is not a clash with themselves.
    await expect(setTeamName(db, a, "second")).resolves.toBe("second");
  });

  it("rejects a name another manager already has (case-insensitive)", async () => {
    const db = getDb();
    await setTeamName(db, a, "Sunday Wolves");
    const err = await setTeamName(db, b, "sunday WOLVES").catch((e) => e);
    expect(err).toBeInstanceOf(TeamNameError);
    expect((err as TeamNameError).code).toBe("TAKEN");
    expect(await getTeamName(db, b)).toBeNull();
  });

  it("rejects invalid names", async () => {
    const err = await setTeamName(getDb(), a, "<b>").catch((e) => e);
    expect(err).toBeInstanceOf(TeamNameError);
    expect((err as TeamNameError).code).toBe("INVALID");
  });

  it("public profile shows the team name, keeping the manager's own name", async () => {
    const db = getDb();
    const before = await getPublicManagerProfile(db, a);
    expect(before).toMatchObject({ displayName: "Alice", hasTeamName: false });

    await setTeamName(db, a, "Sunday Wolves");
    const after = await getPublicManagerProfile(db, a);
    expect(after).toMatchObject({
      displayName: "Sunday Wolves",
      managerName: "Alice",
      hasTeamName: true,
    });
  });
});

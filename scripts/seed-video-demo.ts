/**
 * Seeds ~3 published gameweeks (+ one open gameweek) for demos / screen recordings.
 * Uses whatever players are currently in `players` (active flag respected for fantasy picks).
 *
 * Usage:
 *   CONFIRM_SEED_VIDEO_DEMO=YES pnpm db:seed-video-demo
 *
 * If the active season already has gameweeks:
 *   CONFIRM_SEED_VIDEO_DEMO=YES CONFIRM_REPLACE_SEASON=YES pnpm db:seed-video-demo
 *
 * Undo: CONFIRM_RESET_SEASON=YES pnpm db:reset-season
 */
import "dotenv/config";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { parseEnv } from "@/env";
import { hashPassword } from "@/server/auth/password";
import { recomputeMatchday } from "@/server/domain/recompute-matchday";
import { saveFantasyTeam } from "@/server/domain/save-fantasy-team";
import { getDb, resetDbConnection } from "@/server/db";
import {
  goals,
  matchIncidents,
  matchMvps,
  matchParticipants,
  matchSides,
  matchdayAttendance,
  matchdays,
  matches,
  players,
  scoringRuleSets,
  seasons,
  users,
} from "@/server/db/schema";

const CONFIRM = process.env.CONFIRM_SEED_VIDEO_DEMO === "YES";
const REPLACE =
  process.env.CONFIRM_REPLACE_SEASON === "YES" ||
  process.env.CONFIRM_REPLACE_DEMO === "YES";

/** Extra managers for the competition table (persistent across season resets). */
const DEMO_MANAGERS = [
  {
    email: "video-demo-1@mkate.demo",
    displayName: "Hassan",
    teamName: "Kariakoo FC",
  },
  {
    email: "video-demo-2@mkate.demo",
    displayName: "Ibrahim",
    teamName: "Mabibo United",
  },
  {
    email: "video-demo-3@mkate.demo",
    displayName: "Farid",
    teamName: "Sinza City",
  },
  {
    email: "video-demo-4@mkate.demo",
    displayName: "Juma",
    teamName: "Chapati XI",
  },
  {
    email: "video-demo-5@mkate.demo",
    displayName: "Rayan",
    teamName: "Sunday Ultras",
  },
] as const;

type PlayerRow = { id: string; displayName: string; active: boolean };

type GoalEvent = {
  side: "A" | "B";
  scorer: string;
  assist: string | null;
  kind?: "open_play" | "penalty" | "own_goal";
};

type IncidentEvent = {
  side: "A" | "B";
  player: string;
  kind: "penalty_saved" | "handball_blocked" | "penalty_missed";
};

type MatchSpec = {
  matchNo: number;
  scoreA: number;
  scoreB: number;
  sideA: string[];
  sideB: string[];
  sideAGk: string | null;
  sideBGk: string | null;
  goals: GoalEvent[];
  incidents?: IncidentEvent[];
  mvp?: string | null;
};

type GameweekSpec = {
  number: number;
  playedOn: string;
  deadlineAt: Date;
  status: "published" | "scheduled";
  attendees: string[];
  matches: MatchSpec[];
};

const GAMEWEEKS: GameweekSpec[] = [
  {
    number: 1,
    playedOn: "2026-10-19",
    deadlineAt: new Date("2026-10-19T07:00:00.000Z"),
    status: "published",
    attendees: [
      "Akil",
      "Murti",
      "Yusuf",
      "Lolo",
      "Ajam",
      "Chapati",
      "June",
      "Ali",
      "Alaqmar",
      "Dula",
      "Nasir",
      "Garnacho",
    ],
    matches: [
      {
        matchNo: 1,
        scoreA: 4,
        scoreB: 2,
        sideA: ["Akil", "Murti", "Yusuf", "Chapati", "June"],
        sideB: ["Lolo", "Ajam", "Ali", "Garnacho", "Nasir"],
        sideAGk: "Yusuf",
        sideBGk: "Lolo",
        mvp: "Akil",
        goals: [
          { side: "A", scorer: "Akil", assist: "Murti" },
          { side: "A", scorer: "Akil", assist: null },
          { side: "A", scorer: "Murti", assist: "Chapati" },
          { side: "A", scorer: "June", assist: null },
          { side: "B", scorer: "Lolo", assist: null },
          { side: "B", scorer: "Ajam", assist: "Ali" },
        ],
      },
    ],
  },
  {
    number: 2,
    playedOn: "2026-10-26",
    deadlineAt: new Date("2026-10-26T07:00:00.000Z"),
    status: "published",
    attendees: [
      "Akil",
      "Murti",
      "Yusuf",
      "Lolo",
      "Ajam",
      "Chapati",
      "Ali",
      "Dula",
      "Dulli",
      "Soldier",
      "Michu",
      "Spana",
    ],
    matches: [
      {
        matchNo: 1,
        scoreA: 2,
        scoreB: 2,
        sideA: ["Akil", "Murti", "Chapati", "Dula", "Soldier"],
        sideB: ["Yusuf", "Lolo", "Ali", "Michu", "Spana"],
        sideAGk: "Soldier",
        sideBGk: "Yusuf",
        mvp: "Murti",
        goals: [
          { side: "A", scorer: "Akil", assist: "Murti" },
          { side: "A", scorer: "Murti", assist: null },
          { side: "B", scorer: "Yusuf", assist: "Lolo" },
          { side: "B", scorer: "Ali", assist: null },
        ],
      },
      {
        matchNo: 2,
        scoreA: 1,
        scoreB: 3,
        sideA: ["Ajam", "Dulli", "Garnacho"],
        sideB: ["June", "Alaqmar", "Nasir"],
        sideAGk: "Dulli",
        sideBGk: "Nasir",
        goals: [
          { side: "A", scorer: "Garnacho", assist: null },
          { side: "B", scorer: "June", assist: "Alaqmar" },
          { side: "B", scorer: "Alaqmar", assist: null },
          { side: "B", scorer: "Nasir", assist: null },
        ],
      },
    ],
  },
  {
    number: 3,
    playedOn: "2026-11-02",
    deadlineAt: new Date("2026-11-02T07:00:00.000Z"),
    status: "published",
    attendees: [
      "Akil",
      "Murti",
      "Yusuf",
      "Lolo",
      "Ajam",
      "Chapati",
      "June",
      "Ali",
      "Jeff",
      "Alaqmar",
      "Dula",
      "Garnacho",
    ],
    matches: [
      {
        matchNo: 1,
        scoreA: 3,
        scoreB: 1,
        sideA: ["Akil", "Murti", "Yusuf", "June", "Dula"],
        sideB: ["Lolo", "Ajam", "Chapati", "Garnacho", "Ali"],
        sideAGk: "Dula",
        sideBGk: "Chapati",
        mvp: "Yusuf",
        goals: [
          { side: "A", scorer: "Yusuf", assist: "Murti" },
          { side: "A", scorer: "Akil", assist: null },
          { side: "A", scorer: "Murti", assist: null, kind: "penalty" },
          { side: "B", scorer: "Lolo", assist: null },
        ],
        incidents: [
          { side: "B", player: "Garnacho", kind: "penalty_missed" },
        ],
      },
    ],
  },
  {
    number: 4,
    playedOn: "2026-11-09",
    deadlineAt: new Date("2026-11-16T07:00:00.000Z"),
    status: "scheduled",
    attendees: [],
    matches: [],
  },
];

function assertConfirmed() {
  if (!CONFIRM) {
    console.error(
      "Refusing to run: set CONFIRM_SEED_VIDEO_DEMO=YES (writes matchdays, matches, scores, and demo fantasy teams).",
    );
    process.exit(1);
  }
}

function requirePlayer(
  byName: Map<string, PlayerRow>,
  displayName: string,
): PlayerRow {
  const row = byName.get(displayName);
  if (!row) {
    const known = [...byName.keys()].sort().join(", ");
    throw new Error(
      `Player "${displayName}" not in database. Current catalogue: ${known}`,
    );
  }
  return row;
}

async function ensureDemoManagers(
  db: ReturnType<typeof getDb>,
  passwordHash: string,
): Promise<string[]> {
  const ids: string[] = [];
  for (const demo of DEMO_MANAGERS) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, demo.email))
      .limit(1);

    if (existing) {
      await db
        .update(users)
        .set({
          displayName: demo.displayName,
          teamName: demo.teamName,
          role: "manager",
          status: "active",
        })
        .where(eq(users.id, existing.id));
      ids.push(existing.id);
      continue;
    }

    const [created] = await db
      .insert(users)
      .values({
        email: demo.email,
        displayName: demo.displayName,
        teamName: demo.teamName,
        passwordHash,
        role: "manager",
        status: "active",
      })
      .returning({ id: users.id });
    ids.push(created!.id);
  }
  return ids;
}

async function replaceSeasonIfNeeded(db: ReturnType<typeof getDb>) {
  const existing = await db
    .select({ id: matchdays.id })
    .from(matchdays)
    .limit(1);

  if (existing.length === 0) return;

  if (!REPLACE) {
    console.error(
      "Active season already has gameweeks. Re-run with CONFIRM_REPLACE_SEASON=YES to wipe season data (like reset-season) and seed demo weeks, or run pnpm db:reset-season first.",
    );
    process.exit(1);
  }

  const [ruleSet] = await db
    .select({ id: scoringRuleSets.id })
    .from(scoringRuleSets)
    .orderBy(asc(scoringRuleSets.createdAt))
    .limit(1);
  if (!ruleSet) {
    console.error("No scoring_rule_sets — run pnpm db:seed first.");
    process.exit(1);
  }

  const seasonName =
    process.env.SEASON_NAME ?? "Season 1 · Nov 2026 – Jan 2027";
  const startsOn = process.env.SEASON_STARTS_ON ?? "2026-11-01";
  const endsOn = process.env.SEASON_ENDS_ON ?? "2027-01-31";

  await db.transaction(async (tx) => {
    await tx.execute(sql`truncate table seasons cascade`);
    await tx.insert(seasons).values({
      name: seasonName,
      startsOn,
      endsOn,
      status: "active",
      ruleSetId: ruleSet.id,
    });
  });

  resetDbConnection();
  console.log("Replaced season (truncated seasons cascade).");
}

async function seedMatch(
  db: ReturnType<typeof getDb>,
  matchdayId: string,
  spec: MatchSpec,
  byName: Map<string, PlayerRow>,
) {
  const [match] = await db
    .insert(matches)
    .values({
      matchdayId,
      matchNo: spec.matchNo,
      scoreA: spec.scoreA,
      scoreB: spec.scoreB,
    })
    .returning();

  const [sideARow] = await db
    .insert(matchSides)
    .values({
      matchId: match!.id,
      side: "A",
      goalkeeperPlayerId: spec.sideAGk
        ? requirePlayer(byName, spec.sideAGk).id
        : null,
    })
    .returning();

  const [sideBRow] = await db
    .insert(matchSides)
    .values({
      matchId: match!.id,
      side: "B",
      goalkeeperPlayerId: spec.sideBGk
        ? requirePlayer(byName, spec.sideBGk).id
        : null,
    })
    .returning();

  for (const name of spec.sideA) {
    await db.insert(matchParticipants).values({
      matchId: match!.id,
      playerId: requirePlayer(byName, name).id,
      sideId: sideARow!.id,
    });
  }
  for (const name of spec.sideB) {
    await db.insert(matchParticipants).values({
      matchId: match!.id,
      playerId: requirePlayer(byName, name).id,
      sideId: sideBRow!.id,
    });
  }

  let seq = 1;
  for (const event of spec.goals) {
    const scorer = requirePlayer(byName, event.scorer);
    const assist = event.assist
      ? requirePlayer(byName, event.assist).id
      : null;
    await db.insert(goals).values({
      matchId: match!.id,
      sideId: event.side === "A" ? sideARow!.id : sideBRow!.id,
      scorerId: scorer.id,
      assistId: assist,
      kind: event.kind ?? "open_play",
      seq: seq++,
    });
  }

  let incidentSeq = 1;
  for (const incident of spec.incidents ?? []) {
    const player = requirePlayer(byName, incident.player);
    await db.insert(matchIncidents).values({
      matchId: match!.id,
      sideId: incident.side === "A" ? sideARow!.id : sideBRow!.id,
      playerId: player.id,
      kind: incident.kind,
      seq: incidentSeq++,
    });
  }

  if (spec.mvp) {
    await db.insert(matchMvps).values({
      matchId: match!.id,
      playerId: requirePlayer(byName, spec.mvp).id,
    });
  }
}

function fantasyPickForManager(
  activeIds: readonly string[],
  managerIndex: number,
): {
  playerIds: string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
} {
  const n = activeIds.length;
  if (n < 5) {
    throw new Error(`Need at least 5 active players for fantasy squads (have ${n}).`);
  }
  const offset = (managerIndex * 2) % n;
  const picked: string[] = [];
  for (let i = 0; i < 5; i++) {
    picked.push(activeIds[(offset + i) % n]!);
  }
  return {
    playerIds: picked,
    captainPlayerId: picked[0]!,
    viceCaptainPlayerId: picked[1]!,
  };
}

async function main() {
  assertConfirmed();
  parseEnv(process.env);

  let db = getDb();
  await replaceSeasonIfNeeded(db);
  db = getDb();

  const squad = await db.select().from(players).orderBy(asc(players.displayName));
  const byName = new Map(squad.map((p) => [p.displayName, p]));
  const activeIds = squad.filter((p) => p.active).map((p) => p.id);

  const [season] = await db
    .select({ id: seasons.id, ruleSetId: seasons.ruleSetId })
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  if (!season) {
    console.error("No active season — run pnpm db:seed first.");
    process.exit(1);
  }

  await db
    .update(scoringRuleSets)
    .set({ transfersStartMatchday: 1 })
    .where(eq(scoringRuleSets.id, season.ruleSetId));

  const demoPassword =
    process.env.VIDEO_DEMO_MANAGER_PASSWORD ?? "VideoDemo1!";
  const demoPasswordHash = await hashPassword(demoPassword);
  const demoManagerIds = await ensureDemoManagers(db, demoPasswordHash);
  console.log(
    `Ensured ${demoManagerIds.length} demo managers (login password: ${demoPassword}).`,
  );

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const [admin] = adminEmail
    ? await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, adminEmail))
        .limit(1)
    : [undefined];

  const managers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.status, "active"),
        inArray(users.role, ["manager", "admin"]),
      ),
    );

  const publishedMatchdayIds: string[] = [];

  for (const gw of GAMEWEEKS) {
    const [matchday] = await db
      .insert(matchdays)
      .values({
        seasonId: season.id,
        number: gw.number,
        playedOn: gw.playedOn,
        deadlineAt: gw.deadlineAt,
        status: gw.status,
        publishedAt: gw.status === "published" ? new Date() : null,
      })
      .returning();

    if (gw.attendees.length > 0) {
      await db.insert(matchdayAttendance).values(
        gw.attendees.map((name) => ({
          matchdayId: matchday!.id,
          playerId: requirePlayer(byName, name).id,
        })),
      );
    }

    for (const matchSpec of gw.matches) {
      await seedMatch(db, matchday!.id, matchSpec, byName);
    }

    if (gw.status === "published") {
      publishedMatchdayIds.push(matchday!.id);
      await recomputeMatchday(matchday!.id);
    }

    console.log(
      `Gameweek ${gw.number} (${gw.playedOn}) — ${gw.status}, ${gw.matches.length} match(es)`,
    );
  }

  if (admin) {
    let managerIndex = 0;
    for (const manager of managers) {
      const pick = fantasyPickForManager(activeIds, managerIndex);
      managerIndex += 1;
      for (const matchdayId of publishedMatchdayIds) {
        await saveFantasyTeam(db, matchdayId, pick, {
          mode: "admin_override",
          adminUserId: admin.id,
          targetManagerId: manager.id,
          reason: "Video demo seed",
        });
      }
    }
    console.log(
      `Fantasy teams seeded for ${managers.length} manager(s) across ${publishedMatchdayIds.length} published gameweeks.`,
    );
  } else {
    console.log(
      "Skipped fantasy teams (set ADMIN_EMAIL in .env so admin_override can run).",
    );
  }

  console.log("Video demo seed complete.");
  console.log(
    "  Published: GW1–GW3 · Open pick: GW4 (scheduled). Reset with CONFIRM_RESET_SEASON=YES pnpm db:reset-season",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

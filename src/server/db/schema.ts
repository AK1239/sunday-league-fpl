import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const seasonStatusEnum = pgEnum("season_status", [
  "upcoming",
  "active",
  "closed",
]);

export const matchdayStatusEnum = pgEnum("matchday_status", [
  "draft",
  "published",
]);

export const matchSideEnum = pgEnum("match_side", ["A", "B"]);

export const pointKindEnum = pgEnum("point_kind", [
  "attendance",
  "win",
  "draw",
  "goal",
  "assist",
  "mvp",
  "clean_sheet",
]);

export const seasonAwardEnum = pgEnum("season_award", [
  "champion",
  "golden_boot",
  "playmaker",
  "most_appearances",
  "most_wins",
]);

export const userRoleEnum = pgEnum("user_role", ["manager", "admin"]);

export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    nickname: text("nickname"),
    avatarUrl: text("avatar_url"),
    active: boolean("active").notNull().default(true),
    joinedOn: date("joined_on"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("players_display_name_lower_unique").on(
      sql`lower(${table.displayName})`,
    ),
  ],
);

export const scoringRuleSets = pgTable("scoring_rule_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  attendancePts: integer("attendance_pts").notNull(),
  winPts: integer("win_pts").notNull(),
  drawPts: integer("draw_pts").notNull(),
  goalPts: integer("goal_pts").notNull(),
  assistPts: integer("assist_pts").notNull(),
  mvpPts: integer("mvp_pts").notNull(),
  cleanSheetPts: integer("clean_sheet_pts").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: seasonStatusEnum("status").notNull().default("upcoming"),
    ruleSetId: uuid("rule_set_id")
      .notNull()
      .references(() => scoringRuleSets.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (table) => [
    check("seasons_dates_check", sql`${table.endsOn} > ${table.startsOn}`),
    index("seasons_status_idx").on(table.status),
  ],
);

export const matchdays = pgTable(
  "matchdays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    number: integer("number").notNull(),
    playedOn: date("played_on").notNull(),
    status: matchdayStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    notes: text("notes"),
  },
  (table) => [
    uniqueIndex("matchdays_season_number_unique").on(
      table.seasonId,
      table.number,
    ),
    uniqueIndex("matchdays_season_played_on_unique").on(
      table.seasonId,
      table.playedOn,
    ),
    index("matchdays_season_status_idx").on(table.seasonId, table.status),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    matchNo: integer("match_no").notNull(),
    scoreA: integer("score_a").notNull(),
    scoreB: integer("score_b").notNull(),
  },
  (table) => [
    uniqueIndex("matches_matchday_match_no_unique").on(
      table.matchdayId,
      table.matchNo,
    ),
    index("matches_matchday_idx").on(table.matchdayId),
    check("matches_score_a_nonneg", sql`${table.scoreA} >= 0`),
    check("matches_score_b_nonneg", sql`${table.scoreB} >= 0`),
  ],
);

export const matchSides = pgTable(
  "match_sides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    side: matchSideEnum("side").notNull(),
    goalkeeperPlayerId: uuid("goalkeeper_player_id").references(
      () => players.id,
    ),
  },
  (table) => [
    uniqueIndex("match_sides_match_side_unique").on(table.matchId, table.side),
  ],
);

export const matchParticipants = pgTable(
  "match_participants",
  {
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    sideId: uuid("side_id")
      .notNull()
      .references(() => matchSides.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.playerId] }),
    index("match_participants_player_idx").on(table.playerId),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    sideId: uuid("side_id")
      .notNull()
      .references(() => matchSides.id, { onDelete: "cascade" }),
    scorerId: uuid("scorer_id").notNull(),
    assistId: uuid("assist_id"),
    seq: integer("seq").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.matchId, table.scorerId],
      foreignColumns: [matchParticipants.matchId, matchParticipants.playerId],
    }).onDelete("cascade"),
    check(
      "goals_scorer_assist_distinct",
      sql`${table.assistId} IS NULL OR ${table.scorerId} <> ${table.assistId}`,
    ),
    index("goals_match_idx").on(table.matchId),
  ],
);

export const matchMvps = pgTable("match_mvps", {
  matchId: uuid("match_id")
    .primaryKey()
    .references(() => matches.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
});

export const matchdayAttendance = pgTable(
  "matchday_attendance",
  {
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
  },
  (table) => [primaryKey({ columns: [table.matchdayId, table.playerId] })],
);

export const pointLedger = pgTable(
  "point_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "cascade",
    }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    kind: pointKindEnum("kind").notNull(),
    points: integer("points").notNull(),
    sourceRef: uuid("source_ref"),
    ruleSetId: uuid("rule_set_id")
      .notNull()
      .references(() => scoringRuleSets.id),
    generation: integer("generation").notNull().default(1),
  },
  (table) => [
    index("point_ledger_season_player_idx").on(table.seasonId, table.playerId),
    index("point_ledger_matchday_idx").on(table.matchdayId),
  ],
);

export const matchdaySnapshots = pgTable(
  "matchday_snapshots",
  {
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    rankAfter: integer("rank_after").notNull(),
    pointsAfter: integer("points_after").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchdayId, table.playerId] }),
    index("matchday_snapshots_matchday_idx").on(table.matchdayId),
  ],
);

export const seasonAwards = pgTable("season_awards", {
  id: uuid("id").defaultRandom().primaryKey(),
  seasonId: uuid("season_id")
    .notNull()
    .references(() => seasons.id),
  award: seasonAwardEnum("award").notNull(),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.id),
  value: integer("value").notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: userRoleEnum("role").notNull().default("manager"),
  linkedPlayerId: uuid("linked_player_id").references(() => players.id),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const managerInvites = pgTable("manager_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  label: text("label"),
  linkedPlayerId: uuid("linked_player_id").references(() => players.id),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedByUserId: uuid("used_by_user_id").references(() => users.id),
  resetUserId: uuid("reset_user_id").references(() => users.id),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

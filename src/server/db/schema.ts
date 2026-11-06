import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  real,
  smallint,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
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
  "scheduled",
  "draft",
  "published",
  "cancelled",
]);

export const fantasyTeamSourceEnum = pgEnum("fantasy_team_source", [
  "manual",
  "carry_over",
  "admin",
]);

export const fantasyTransferStatusEnum = pgEnum("fantasy_transfer_status", [
  "active",
  "void",
]);

export const fantasyTransferSourceEnum = pgEnum("fantasy_transfer_source", [
  "manager",
  "admin_correction",
]);

export const managerScoreLineRoleEnum = pgEnum("manager_score_line_role", [
  "player",
  "captain",
  "vice_captain",
  "reserve",
]);

export const fantasySquadKindEnum = pgEnum("fantasy_squad_kind", [
  "permanent",
  "free_hit",
]);

export const managerChipPlayStatusEnum = pgEnum("manager_chip_play_status", [
  "active",
  "void",
]);

export const managerChipPlaySourceEnum = pgEnum("manager_chip_play_source", [
  "manager",
  "admin",
]);

export const managerMatchdayTeamSourceEnum = pgEnum(
  "manager_matchday_team_source",
  ["manual", "carry_over", "admin", "none"],
);

export const matchSideEnum = pgEnum("match_side", ["A", "B"]);

export const pointKindEnum = pgEnum("point_kind", [
  "attendance",
  "win",
  "draw",
  "goal",
  "assist",
  "mvp",
  "clean_sheet",
  "own_goal",
  "penalty_saved",
  "handball",
  "penalty_missed",
]);

export const goalKindEnum = pgEnum("goal_kind", [
  "open_play",
  "penalty",
  "own_goal",
]);

export const matchIncidentKindEnum = pgEnum("match_incident_kind", [
  "penalty_saved",
  "handball_blocked",
  "penalty_missed",
]);

export const seasonAwardEnum = pgEnum("season_award", [
  "champion",
  "manager_champion",
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
    /** Shirt design key (`KITS` in `lib/kits.ts`); null = derive from display name (legacy). */
    kitKey: text("kit_key"),
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
  /** Replaces goalPts for a goal scored from a penalty. */
  penaltyGoalPts: integer("penalty_goal_pts").notNull().default(3),
  penaltySavedPts: integer("penalty_saved_pts").notNull().default(5),
  ownGoalPts: integer("own_goal_pts").notNull().default(-2),
  /** Handball that stops a goal. */
  handballPts: integer("handball_pts").notNull().default(-2),
  /** Missed penalty (not saved by GK) — taker loses these points. */
  penaltyMissedPts: integer("penalty_missed_pts").notNull().default(-2),
  /** Captain fantasy multiplier as hundredths (200 = 2×). */
  captainMultiplier: integer("captain_multiplier").notNull().default(200),
  /** Vice-captain fantasy multiplier as hundredths (150 = 1.5×). */
  viceCaptainMultiplier: integer("vice_captain_multiplier").notNull().default(150),
  freeTransfersPerMatchday: smallint("free_transfers_per_matchday")
    .notNull()
    .default(2),
  maxBankedFreeTransfers: smallint("max_banked_free_transfers")
    .notNull()
    .default(3),
  extraTransferPenalty: smallint("extra_transfer_penalty").notNull().default(4),
  /** null = transfers off; number = first GW with transfer rules. */
  transfersStartMatchday: integer("transfers_start_matchday"),
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
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    status: matchdayStatusEnum("status").notNull().default("scheduled"),
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
    /** For own goals this is the player who put it in (on the OPPOSITE side to `sideId`, the side credited). */
    scorerId: uuid("scorer_id").notNull(),
    assistId: uuid("assist_id"),
    kind: goalKindEnum("kind").notNull().default("open_play"),
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
    check(
      "goals_assist_only_open_play",
      sql`${table.kind} = 'open_play' OR ${table.assistId} IS NULL`,
    ),
    index("goals_match_idx").on(table.matchId),
  ],
);

/** Non-goal events: penalty saved (+pts) and handball that stopped a goal (-pts). */
export const matchIncidents = pgTable(
  "match_incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    /** Side of the player involved. */
    sideId: uuid("side_id")
      .notNull()
      .references(() => matchSides.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull(),
    kind: matchIncidentKindEnum("kind").notNull(),
    seq: integer("seq").notNull(),
  },
  (table) => [
    foreignKey({
      name: "match_incidents_participant_fk",
      columns: [table.matchId, table.playerId],
      foreignColumns: [matchParticipants.matchId, matchParticipants.playerId],
    }).onDelete("cascade"),
    index("match_incidents_match_idx").on(table.matchId),
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

export const seasonAwards = pgTable(
  "season_awards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    award: seasonAwardEnum("award").notNull(),
    playerId: uuid("player_id").references(() => players.id),
    managerId: uuid("manager_id").references(() => users.id),
    value: integer("value").notNull(),
  },
  (table) => [
    uniqueIndex("season_awards_season_award_unique").on(
      table.seasonId,
      table.award,
    ),
    check(
      "season_awards_winner_check",
      sql`(((${table.playerId} IS NOT NULL)::integer + (${table.managerId} IS NOT NULL)::integer) = 1)`,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    /** Optional team name shown in public tables instead of `displayName`. */
    teamName: text("team_name"),
    role: userRoleEnum("role").notNull().default("manager"),
    linkedPlayerId: uuid("linked_player_id").references(() => players.id),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("users_team_name_lower_unique")
      .on(sql`lower(${table.teamName})`)
      .where(sql`${table.teamName} IS NOT NULL`),
  ],
);

export const managerInvites = pgTable(
  "manager_invites",
  {
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
    /** When true, many managers can register with the same link until it expires. */
    reusable: boolean("reusable").notNull().default(false),
  },
  (table) => [
    check(
      "manager_invites_reusable_reset_exclusive",
      sql`NOT (${table.reusable} = true AND ${table.resetUserId} IS NOT NULL)`,
    ),
  ],
);

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
  /** Client IP when known (e.g. login). */
  ipAddress: text("ip_address"),
  /** User-Agent when known. */
  userAgent: text("user_agent"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const leagueSettings = pgTable("league_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  timezone: text("timezone").notNull().default("Africa/Dar_es_Salaam"),
  defaultKickoffTime: time("default_kickoff_time")
    .notNull()
    .default("16:00:00"),
  deadlineOffsetMinutes: integer("deadline_offset_minutes")
    .notNull()
    .default(0),
});

export const fantasyTeams = pgTable(
  "fantasy_teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    captainPlayerId: uuid("captain_player_id")
      .notNull()
      .references(() => players.id),
    viceCaptainPlayerId: uuid("vice_captain_player_id")
      .notNull()
      .references(() => players.id),
    source: fantasyTeamSourceEnum("source").notNull().default("manual"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    version: integer("version").notNull().default(1),
    squadKind: fantasySquadKindEnum("squad_kind")
      .notNull()
      .default("permanent"),
    reservePlayerId: uuid("reserve_player_id").references(() => players.id),
    /** Bench Boost second extra player (first is `reservePlayerId`). */
    reservePlayerId2: uuid("reserve_player_id_2").references(() => players.id),
  },
  (table) => [
    uniqueIndex("fantasy_teams_manager_matchday_unique").on(
      table.managerId,
      table.matchdayId,
    ),
    check(
      "fantasy_teams_captain_vice_distinct",
      sql`${table.captainPlayerId} <> ${table.viceCaptainPlayerId}`,
    ),
    check(
      "fantasy_teams_reserve_not_captain",
      sql`${table.reservePlayerId} IS NULL OR (${table.reservePlayerId} <> ${table.captainPlayerId} AND ${table.reservePlayerId} <> ${table.viceCaptainPlayerId})`,
    ),
    check(
      "fantasy_teams_reserve2_valid",
      sql`${table.reservePlayerId2} IS NULL OR (${table.reservePlayerId} IS NOT NULL AND ${table.reservePlayerId2} <> ${table.reservePlayerId} AND ${table.reservePlayerId2} <> ${table.captainPlayerId} AND ${table.reservePlayerId2} <> ${table.viceCaptainPlayerId})`,
    ),
    index("fantasy_teams_matchday_idx").on(table.matchdayId),
  ],
);

export const fantasyTeamPlayers = pgTable(
  "fantasy_team_players",
  {
    fantasyTeamId: uuid("fantasy_team_id")
      .notNull()
      .references(() => fantasyTeams.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
  },
  (table) => [
    primaryKey({ columns: [table.fantasyTeamId, table.playerId] }),
    index("fantasy_team_players_player_idx").on(table.playerId),
  ],
);

export const fantasyTransfers = pgTable(
  "fantasy_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    seq: smallint("seq").notNull(),
    playerOutId: uuid("player_out_id")
      .notNull()
      .references(() => players.id),
    playerInId: uuid("player_in_id")
      .notNull()
      .references(() => players.id),
    status: fantasyTransferStatusEnum("status").notNull().default("active"),
    source: fantasyTransferSourceEnum("source").notNull().default("manager"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    voidedBy: uuid("voided_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    check(
      "fantasy_transfers_out_in_distinct",
      sql`${table.playerOutId} <> ${table.playerInId}`,
    ),
    uniqueIndex("fantasy_transfers_manager_matchday_out_active")
      .on(table.managerId, table.matchdayId, table.playerOutId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("fantasy_transfers_manager_matchday_in_active")
      .on(table.managerId, table.matchdayId, table.playerInId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("fantasy_transfers_manager_matchday_seq_active")
      .on(table.managerId, table.matchdayId, table.seq)
      .where(sql`${table.status} = 'active'`),
    index("fantasy_transfers_matchday_idx").on(table.matchdayId),
  ],
);

export const managerTransferWindows = pgTable(
  "manager_transfer_windows",
  {
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    freeAvailable: smallint("free_available").notNull(),
    unlimited: boolean("unlimited").notNull().default(false),
    chipCode: text("chip_code"),
    penaltyPerExtra: smallint("penalty_per_extra").notNull(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.managerId, table.matchdayId] }),
    index("manager_transfer_windows_season_idx").on(table.seasonId),
  ],
);

export const seasonChips = pgTable(
  "season_chips",
  {
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    chipCode: text("chip_code").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    availableFromMatchday: integer("available_from_matchday")
      .notNull()
      .default(1),
    params: jsonb("params").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.seasonId, table.chipCode] })],
);

export const managerChipPlays = pgTable(
  "manager_chip_plays",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    chipCode: text("chip_code").notNull(),
    status: managerChipPlayStatusEnum("status").notNull().default("active"),
    source: managerChipPlaySourceEnum("source").notNull().default("manager"),
    params: jsonb("params").notNull().default({}),
    activatedAt: timestamp("activated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidReason: text("void_reason"),
    voidedBy: uuid("voided_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    check(
      "manager_chip_plays_void_fields_check",
      sql`(${table.status} = 'active' AND ${table.voidedAt} IS NULL) OR (${table.status} = 'void' AND ${table.voidedAt} IS NOT NULL AND ${table.voidReason} IS NOT NULL)`,
    ),
    uniqueIndex("manager_chip_plays_one_active_per_matchday")
      .on(table.managerId, table.matchdayId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("manager_chip_plays_one_active_per_chip_per_season")
      .on(table.managerId, table.seasonId, table.chipCode)
      .where(sql`${table.status} = 'active'`),
    index("manager_chip_plays_matchday_idx").on(table.matchdayId),
    index("manager_chip_plays_season_manager_idx").on(
      table.seasonId,
      table.managerId,
    ),
    foreignKey({
      columns: [table.seasonId, table.chipCode],
      foreignColumns: [seasonChips.seasonId, seasonChips.chipCode],
    }),
  ],
);

export const managerFreeTransferAdjustments = pgTable(
  "manager_free_transfer_adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    delta: smallint("delta").notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "manager_free_transfer_adjustments_delta_nonzero",
      sql`${table.delta} <> 0`,
    ),
    index("manager_free_transfer_adjustments_matchday_idx").on(
      table.matchdayId,
    ),
  ],
);

export const managerScoreLines = pgTable(
  "manager_score_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    role: managerScoreLineRoleEnum("role").notNull(),
    basePoints: integer("base_points").notNull(),
    multiplier: real("multiplier").notNull(),
    points: integer("points").notNull(),
    attended: boolean("attended").notNull(),
    teamSource: managerMatchdayTeamSourceEnum("team_source").notNull(),
  },
  (table) => [
    uniqueIndex("manager_score_lines_manager_matchday_player_unique").on(
      table.managerId,
      table.matchdayId,
      table.playerId,
    ),
    index("manager_score_lines_matchday_idx").on(table.matchdayId),
  ],
);

export const managerMatchdayScores = pgTable(
  "manager_matchday_scores",
  {
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id),
    squadPoints: integer("squad_points").notNull().default(0),
    transferPenalty: integer("transfer_penalty").notNull().default(0),
    totalPoints: integer("total_points").notNull(),
    multiplierPlayerId: uuid("multiplier_player_id").references(
      () => players.id,
    ),
    /** Which player had the captain × applied (if they attended). */
    captainMultiplierPlayerId: uuid("captain_multiplier_player_id").references(
      () => players.id,
    ),
    /** Which player had the vice-captain × applied (if they attended). */
    viceCaptainMultiplierPlayerId: uuid(
      "vice_captain_multiplier_player_id",
    ).references(() => players.id),
    teamSource: managerMatchdayTeamSourceEnum("team_source").notNull(),
    chipCode: text("chip_code"),
    chipBonus: integer("chip_bonus").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.managerId, table.matchdayId] }),
    check(
      "manager_matchday_scores_total_check",
      sql`${table.totalPoints} = ${table.squadPoints} + ${table.transferPenalty}`,
    ),
    check(
      "manager_matchday_scores_transfer_penalty_non_positive",
      sql`${table.transferPenalty} <= 0`,
    ),
    index("manager_matchday_scores_season_idx").on(table.seasonId),
  ],
);

export const managerRankSnapshots = pgTable(
  "manager_rank_snapshots",
  {
    matchdayId: uuid("matchday_id")
      .notNull()
      .references(() => matchdays.id, { onDelete: "cascade" }),
    managerId: uuid("manager_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rankAfter: integer("rank_after").notNull(),
    pointsAfter: integer("points_after").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.matchdayId, table.managerId] }),
    index("manager_rank_snapshots_matchday_idx").on(table.matchdayId),
  ],
);

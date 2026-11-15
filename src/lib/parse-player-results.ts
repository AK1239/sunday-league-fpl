/**
 * Free-text "results per player for the whole day" parser.
 *
 *   Dula - 6 goals, 1 missed penalty
 *   Yusuf - 2 penalty save, 1 goal, 1 assists
 *
 * Pure and dependency-free so it runs in the browser (live preview) and on the
 * server (tests).
 */

export const DAY_STAT_KEYS = [
  "goals",
  "penaltyGoals",
  "assists",
  "penaltiesMissed",
  "penaltiesSaved",
  "ownGoals",
  "handballs",
  "cleanSheets",
  "hatTricks",
  "mvps",
] as const;

export type DayStatKey = (typeof DAY_STAT_KEYS)[number];
export type DayStats = Record<DayStatKey, number>;

export const DAY_STAT_LABELS: Record<DayStatKey, string> = {
  goals: "Goals",
  penaltyGoals: "Pen. scored",
  assists: "Assists",
  penaltiesMissed: "Pen. missed",
  penaltiesSaved: "Pen. saved",
  ownGoals: "Own goals",
  handballs: "Handballs",
  cleanSheets: "Clean sheets",
  hatTricks: "Hat-tricks",
  mvps: "MVP",
};

export function emptyDayStats(): DayStats {
  return {
    goals: 0,
    penaltyGoals: 0,
    assists: 0,
    penaltiesMissed: 0,
    penaltiesSaved: 0,
    ownGoals: 0,
    handballs: 0,
    cleanSheets: 0,
    hatTricks: 0,
    mvps: 0,
  };
}

export function hasAnyDayStat(stats: DayStats): boolean {
  return DAY_STAT_KEYS.some((k) => stats[k] > 0);
}

/** Ordered: more specific phrases first. Matched against a lowercased phrase. */
const STAT_PATTERNS: { key: DayStatKey; re: RegExp }[] = [
  {
    key: "penaltyGoals",
    re: /^(?:pen(?:alty|alties|s)?\s*(?:goals?|scored|score|scores|converted|in)|(?:scored|converted)\s*pen(?:alty|alties|s)?|pen(?:alty|alties|s)?\s*goals?)$/,
  },
  {
    key: "penaltiesMissed",
    re: /^(?:(?:missed|miss|failed)\s*(?:a\s*)?pen(?:alty|alties|s)?|pen(?:alty|alties|s)?\s*(?:missed|misses|miss|fail(?:ed)?|wasted))$/,
  },
  {
    key: "penaltiesSaved",
    re: /^(?:(?:saved|save)\s*(?:a\s*)?pen(?:alty|alties|s)?|pen(?:alty|alties|s)?\s*(?:saved|saves|save))$/,
  },
  { key: "ownGoals", re: /^(?:own\s*-?\s*goals?|ogs?)$/ },
  { key: "hatTricks", re: /^(?:hat\s*-?\s*tricks?)$/ },
  { key: "cleanSheets", re: /^(?:clean\s*-?\s*sheets?|cs)$/ },
  { key: "handballs", re: /^(?:hand\s*-?\s*balls?|hb)$/ },
  { key: "assists", re: /^(?:assists?|assits?|asists?|ast)$/ },
  { key: "goals", re: /^(?:goals?|gls?)$/ },
  { key: "mvps", re: /^(?:mvps?)$/ },
];

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export type ParsePlayer = {
  id: string;
  displayName: string;
  nickname?: string | null;
};

export type ParsedLine = {
  lineNo: number;
  raw: string;
  /** Name as typed. */
  name: string;
  /** Resolved player, or null when unmatched / ambiguous. */
  playerId: string | null;
  /** Set when the name could be several players. */
  ambiguousIds: string[];
  /** True when matched by fuzzy rather than exact/prefix. */
  fuzzy: boolean;
  stats: DayStats;
  /** Tokens we could not understand. */
  unparsed: string[];
};

export type ParseResult = {
  lines: ParsedLine[];
};

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(
        prev[j]! + 1,
        prev[j - 1]! + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

function isSubsequence(small: string, big: string): boolean {
  let i = 0;
  for (const ch of big) {
    if (ch === small[i]) i++;
    if (i === small.length) return true;
  }
  return small.length === 0;
}

type MatchOutcome = {
  playerId: string | null;
  ambiguousIds: string[];
  fuzzy: boolean;
};

export function matchPlayerName(
  typed: string,
  players: readonly ParsePlayer[],
): MatchOutcome {
  const t = normName(typed);
  if (!t) return { playerId: null, ambiguousIds: [], fuzzy: false };

  const keysFor = (p: ParsePlayer) =>
    [p.displayName, p.nickname ?? ""].map(normName).filter(Boolean);

  // 1. exact on display name / nickname
  const exact = players.filter((p) => keysFor(p).includes(t));
  if (exact.length === 1)
    return { playerId: exact[0]!.id, ambiguousIds: [], fuzzy: false };
  if (exact.length > 1)
    return {
      playerId: null,
      ambiguousIds: exact.map((p) => p.id),
      fuzzy: false,
    };

  // 2. score every candidate; lower is better.
  const scored = players
    .map((p) => {
      let best = Infinity;
      for (const key of keysFor(p)) {
        let score = levenshtein(t, key);
        if (key.startsWith(t) && t.length >= 2) score = Math.min(score, 0.25);
        else if (t.length >= 3 && isSubsequence(t, key)) score -= 0.5;
        best = Math.min(best, score);
      }
      return { id: p.id, score: best };
    })
    .sort((a, b) => a.score - b.score);

  const top = scored[0];
  if (!top) return { playerId: null, ambiguousIds: [], fuzzy: false };

  const maxDist = t.length <= 3 ? 1 : t.length <= 5 ? 1.5 : 2.5;
  if (top.score > maxDist)
    return { playerId: null, ambiguousIds: [], fuzzy: false };

  const tied = scored.filter((s) => s.score === top.score);
  if (tied.length > 1)
    return { playerId: null, ambiguousIds: tied.map((s) => s.id), fuzzy: true };
  return { playerId: top.id, ambiguousIds: [], fuzzy: true };
}

function parseStatToken(
  token: string,
): { key: DayStatKey; qty: number } | null {
  let s = token.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return null;
  // "x2" / "2x" forms
  s = s.replace(/^x\s*(\d+)\s*/, "$1 ").replace(/^(\d+)\s*x\s+/, "$1 ");
  let qty = 1;
  let rest = s;
  const num = /^(\d+)\s*(.*)$/.exec(s);
  if (num) {
    qty = Number(num[1]);
    rest = num[2]!;
  } else {
    const word = /^([a-z]+)\s+(.*)$/.exec(s);
    if (word && WORD_NUMBERS[word[1]!] !== undefined) {
      qty = WORD_NUMBERS[word[1]!]!;
      rest = word[2]!;
    }
  }
  // trailing "x2" / "(2)"
  const trail = /^(.*?)\s*(?:x|\()\s*(\d+)\)?$/.exec(rest);
  if (trail && trail[1]) {
    rest = trail[1];
    if (!num) qty = Number(trail[2]);
  }
  rest = rest.replace(/[.!]+$/, "").trim();
  if (!rest) return null;
  for (const { key, re } of STAT_PATTERNS) {
    if (re.test(rest)) return { key, qty };
  }
  return null;
}

/** Splits the stats half of a line into tokens. */
function splitTokens(body: string): string[] {
  return body
    .replace(/\band\b|&|\+/gi, ",")
    .split(/[,;\n]+/)
    .flatMap((part) =>
      // "2 goals 1 assist" (missing comma): split before a digit that follows a letter.
      part.split(/(?<=[a-z.)])\s+(?=\d)/i),
    )
    .map((s) => s.trim())
    .filter(Boolean);
}

const NAME_SPLIT = /\s*[-–—:=]\s*/;

export function parsePlayerResults(
  text: string,
  players: readonly ParsePlayer[],
): ParseResult {
  const lines: ParsedLine[] = [];
  const rawLines = text.split(/\r?\n/);

  rawLines.forEach((raw, index) => {
    const trimmed = raw.trim().replace(/^[•*\d]+[.)]\s+|^[•*]\s*/, "");
    if (!trimmed) return;

    const m = NAME_SPLIT.exec(trimmed);
    let name: string;
    let body: string;
    if (m && m.index > 0) {
      name = trimmed.slice(0, m.index).trim();
      body = trimmed.slice(m.index + m[0].length);
    } else {
      // "Akil 2 goals" form: name is the leading letters.
      const lead = /^([^\d,]+?)\s+(\d.*)$/.exec(trimmed);
      name = lead ? lead[1]!.trim() : trimmed;
      body = lead ? lead[2]! : "";
    }

    const stats = emptyDayStats();
    const unparsed: string[] = [];
    for (const token of splitTokens(body)) {
      const parsed = parseStatToken(token);
      if (!parsed) unparsed.push(token);
      else stats[parsed.key] += parsed.qty;
    }

    const outcome = matchPlayerName(name, players);
    lines.push({
      lineNo: index + 1,
      raw: trimmed,
      name,
      playerId: outcome.playerId,
      ambiguousIds: outcome.ambiguousIds,
      fuzzy: outcome.fuzzy,
      stats,
      unparsed,
    });
  });

  return { lines };
}

/** Sum parsed lines into one stats record per resolved player. */
export function mergeParsedLines(
  lines: readonly ParsedLine[],
): Map<string, DayStats> {
  const out = new Map<string, DayStats>();
  for (const line of lines) {
    if (!line.playerId) continue;
    const cur = out.get(line.playerId) ?? emptyDayStats();
    for (const k of DAY_STAT_KEYS) cur[k] += line.stats[k];
    out.set(line.playerId, cur);
  }
  return out;
}

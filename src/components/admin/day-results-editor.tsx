"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { Button } from "@/components/ui/button";
import { appToast } from "@/lib/app-toast";
import {
  DAY_STAT_KEYS,
  DAY_STAT_LABELS,
  emptyDayStats,
  mergeParsedLines,
  parsePlayerResults,
  type DayStatKey,
  type DayStats,
} from "@/lib/parse-player-results";
import { cn } from "@/lib/utils";
import { saveMatchdayDayStatsAction } from "@/server/actions/match-entry";
import type {
  MatchdayDayStatsEntry,
  MatchEntryPlayer,
} from "@/server/domain/match-entry-types";

/** Stats shown by default; the rest live behind "More". */
const PRIMARY_KEYS: DayStatKey[] = [
  "goals",
  "assists",
  "penaltiesMissed",
  "penaltiesSaved",
];
const MORE_KEYS = DAY_STAT_KEYS.filter((k) => !PRIMARY_KEYS.includes(k));

type Row = { playerId: string; stats: DayStats };

function summarise(stats: DayStats): string {
  return DAY_STAT_KEYS.filter((k) => stats[k] > 0)
    .map((k) => `${stats[k]} ${DAY_STAT_LABELS[k].toLowerCase()}`)
    .join(", ");
}

export function DayResultsEditor({
  matchdayId,
  players,
  initialStats,
  attendeeIds,
  onAttendeesChange,
  isPublished,
}: {
  matchdayId: string;
  players: MatchEntryPlayer[];
  initialStats: MatchdayDayStatsEntry[];
  attendeeIds: string[];
  onAttendeesChange: (ids: string[]) => void;
  isPublished: boolean;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialStats.map((s) => ({ playerId: s.playerId, stats: { ...s.stats } })),
  );
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [pickValue, setPickValue] = useState("");
  /** Manual picks for unmatched / ambiguous parsed lines, keyed by line number. */
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const parsed = useMemo(
    () => (text.trim() ? parsePlayerResults(text, players) : null),
    [text, players],
  );

  const resolvedLines = useMemo(
    () =>
      parsed?.lines.map((line) => ({
        ...line,
        playerId: overrides[line.lineNo] ?? line.playerId,
      })) ?? [],
    [parsed, overrides],
  );

  const unresolvedCount = resolvedLines.filter((l) => !l.playerId).length;
  const unparsedCount = resolvedLines.reduce(
    (n, l) => n + l.unparsed.length,
    0,
  );

  function markDirty(next: Row[]) {
    setRows(next);
    setDirty(true);
  }

  function applyParsed() {
    const merged = mergeParsedLines(resolvedLines);
    const next: Row[] = [...merged].map(([playerId, stats]) => ({
      playerId,
      stats,
    }));
    markDirty(next);
    setOverrides({});
    const ids = new Set(attendeeIds);
    for (const r of next) ids.add(r.playerId);
    onAttendeesChange([...ids]);
    appToast.success(`Loaded ${next.length} players — review, then save`);
  }

  function bump(playerId: string, key: DayStatKey, delta: number) {
    markDirty(
      rows.map((r) =>
        r.playerId === playerId
          ? {
              ...r,
              stats: {
                ...r.stats,
                [key]: Math.max(0, Math.min(99, r.stats[key] + delta)),
              },
            }
          : r,
      ),
    );
  }

  function addPlayer(playerId: string) {
    if (!playerId || rows.some((r) => r.playerId === playerId)) return;
    markDirty([...rows, { playerId, stats: emptyDayStats() }]);
    if (!attendeeIds.includes(playerId))
      onAttendeesChange([...attendeeIds, playerId]);
  }

  function removePlayer(playerId: string) {
    markDirty(rows.filter((r) => r.playerId !== playerId));
  }

  async function save() {
    setSaving(true);
    const ids = [...new Set([...attendeeIds, ...rows.map((r) => r.playerId)])];
    const result = await saveMatchdayDayStatsAction(matchdayId, ids, rows);
    setSaving(false);
    if (result.ok === false) {
      appToast.error(result.message);
      return;
    }
    onAttendeesChange(ids);
    setDirty(false);
    appToast.success(
      isPublished
        ? "Results saved — scores recalculated"
        : "Results saved (draft)",
    );
  }

  const available = players.filter(
    (p) => !rows.some((r) => r.playerId === p.id),
  );
  const keys = showMore ? [...PRIMARY_KEYS, ...MORE_KEYS] : PRIMARY_KEYS;

  return (
    <section className="space-y-4">
      <SectionHeading title="Results by player" />
      <p className="text-sm text-muted-foreground">
        Paste or type one line per player for the whole day, e.g.{" "}
        <code className="rounded bg-muted px-1">
          Dula - 6 goals, 1 missed penalty
        </code>
        . Everyone listed gets attendance automatically. No match sides or
        scores needed.
      </p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOverrides({});
        }}
        rows={6}
        spellCheck={false}
        placeholder={
          "Dula - 6 goals, 1 missed penalty\nYusuf - 2 penalty save, 1 goal, 1 assist\nLolo - 1 goal, 2 assists"
        }
        className="w-full rounded-xl border border-border/60 bg-card/50 p-3 font-mono text-sm outline-none focus:border-primary/50"
        aria-label="Paste results"
      />

      {parsed ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Line</th>
                  <th className="py-1 pr-3">Player</th>
                  <th className="py-1 pr-3">Understood</th>
                </tr>
              </thead>
              <tbody>
                {resolvedLines.map((line) => {
                  const player = line.playerId
                    ? playerMap.get(line.playerId)
                    : null;
                  const candidates =
                    line.ambiguousIds.length > 0
                      ? players.filter((p) => line.ambiguousIds.includes(p.id))
                      : players;
                  return (
                    <tr
                      key={line.lineNo}
                      className="border-t border-border/40 align-top"
                    >
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {line.name || "?"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {player && !overrides[line.lineNo] ? (
                          <span
                            className={cn(
                              "font-medium",
                              line.fuzzy && "text-amber-500",
                            )}
                            title={
                              line.fuzzy ? "Fuzzy match — check" : undefined
                            }
                          >
                            {player.displayName}
                            {line.fuzzy ? " ≈" : ""}
                          </span>
                        ) : (
                          <select
                            value={overrides[line.lineNo] ?? ""}
                            onChange={(e) =>
                              setOverrides((prev) => ({
                                ...prev,
                                [line.lineNo]: e.target.value,
                              }))
                            }
                            className="rounded-md border border-destructive/50 bg-background px-2 py-1 text-xs"
                            aria-label={`Pick player for ${line.name}`}
                          >
                            <option value="">
                              {line.ambiguousIds.length > 0
                                ? "Ambiguous — pick…"
                                : "Not found — pick…"}
                            </option>
                            {candidates.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.displayName}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        {summarise(line.stats) || (
                          <span className="text-muted-foreground">
                            attendance only
                          </span>
                        )}
                        {line.unparsed.length > 0 ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                            <AlertTriangle className="size-3.5" aria-hidden />
                            can’t read: “{line.unparsed.join("”, “")}”
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={unresolvedCount > 0}
              onClick={applyParsed}
            >
              Load into table below
            </Button>
            <span className="text-xs text-muted-foreground">
              Replaces the table below with these lines.
            </span>
            {unresolvedCount > 0 ? (
              <span className="text-xs text-destructive">
                {unresolvedCount} name(s) need picking.
              </span>
            ) : null}
            {unparsedCount > 0 ? (
              <span className="text-xs text-destructive">
                {unparsedCount} unreadable part(s) will be ignored — fix the
                text or fix in the table.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">
            Day totals ({rows.length} players)
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setShowMore((v) => !v)}
            >
              {showMore
                ? "Fewer columns"
                : "More (own goal, handball, clean sheet, hat-trick, MVP)"}
            </button>
            <select
              value={pickValue}
              onChange={(e) => {
                addPlayer(e.target.value);
                setPickValue("");
              }}
              className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
              aria-label="Add player"
            >
              <option value="">+ Add player…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing entered yet. Paste lines above, or add players here and tap
            the + buttons.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Player</th>
                  {keys.map((k) => (
                    <th key={k} className="px-2 py-2 text-center">
                      {DAY_STAT_LABELS[k]}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.playerId} className="border-t border-border/40">
                    <td className="px-3 py-1.5 font-medium">
                      {playerMap.get(row.playerId)?.displayName ?? "?"}
                    </td>
                    {keys.map((k) => (
                      <td key={k} className="px-1 py-1 text-center">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            disabled={row.stats[k] === 0}
                            onClick={() => bump(row.playerId, k, -1)}
                            aria-label={`Fewer ${DAY_STAT_LABELS[k]} for ${playerMap.get(row.playerId)?.displayName}`}
                          >
                            <Minus aria-hidden />
                          </Button>
                          <span
                            className={cn(
                              "w-5 text-center tabular-nums",
                              row.stats[k] === 0 && "text-muted-foreground",
                            )}
                          >
                            {row.stats[k]}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => bump(row.playerId, k, 1)}
                            aria-label={`More ${DAY_STAT_LABELS[k]} for ${playerMap.get(row.playerId)?.displayName}`}
                          >
                            <Plus aria-hidden />
                          </Button>
                        </div>
                      </td>
                    ))}
                    <td className="px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removePlayer(row.playerId)}
                        aria-label="Remove player"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save results"}
          </Button>
          {dirty ? (
            <span className="text-xs text-amber-500">Unsaved changes</span>
          ) : rows.length > 0 ? (
            <span className="text-xs text-muted-foreground">Saved</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

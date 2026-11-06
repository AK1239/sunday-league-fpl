"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2 } from "lucide-react";
import { PlayerAvatar } from "@/components/fantasy/player-avatar";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { appToast, toastActionResult } from "@/lib/app-toast";
import {
  addEmptyMatchAction,
  copyLineupAction,
  saveMatchDraftAction,
  saveMatchdayAttendanceAction,
} from "@/server/actions/match-entry";
import {
  deleteMatchAction,
  publishMatchdayAction,
  recalculateMatchdayAction,
  unpublishMatchdayAction,
} from "@/server/actions/matchday-publish";
import type {
  MatchdayEntryData,
  MatchDraftInput,
  MatchEntryMatch,
} from "@/server/domain/match-entry-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function useDebounced<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delayMs);
    },
    [fn, delayMs],
  );
}

function emptyMatch(matchNo: number, id?: string): MatchEntryMatch {
  return {
    id: id ?? `temp-${matchNo}`,
    matchNo,
    scoreA: 0,
    scoreB: 0,
    sideAPlayerIds: [],
    sideBPlayerIds: [],
    sideAGoalkeeperId: null,
    sideBGoalkeeperId: null,
    goals: [],
    mvpPlayerId: null,
  };
}

function toDraft(match: MatchEntryMatch): MatchDraftInput {
  return {
    matchId: match.id.startsWith("temp-") ? null : match.id,
    matchNo: match.matchNo,
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    sideAPlayerIds: match.sideAPlayerIds,
    sideBPlayerIds: match.sideBPlayerIds,
    sideAGoalkeeperId: match.sideAGoalkeeperId,
    sideBGoalkeeperId: match.sideBGoalkeeperId,
    goals: match.goals,
    mvpPlayerId: match.mvpPlayerId,
  };
}

export function MatchdayEntryClient({
  initial,
}: {
  initial: MatchdayEntryData;
}) {
  const router = useRouter();
  const [attendeeIds, setAttendeeIds] = useState<string[]>(initial.attendeeIds);
  const [matches, setMatches] = useState<MatchEntryMatch[]>(
    initial.matches.length > 0 ? initial.matches : [],
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const [workflowBusy, setWorkflowBusy] = useState(false);

  const playerMap = useMemo(
    () => new Map(initial.players.map((p) => [p.id, p])),
    [initial.players],
  );

  const persistAttendance = useCallback(
    async (ids: string[]) => {
      setSaveState("saving");
      const result = await saveMatchdayAttendanceAction(
        initial.matchdayId,
        ids,
      );
      if (result.ok === false) {
        setSaveState("error");
        appToast.error(result.message);
        return;
      }
      setSaveState("idle");
      appToast.autosaved("Attendance saved");
    },
    [initial.matchdayId],
  );

  const debouncedAttendance = useDebounced(persistAttendance, 600);

  const persistMatch = useCallback(
    async (match: MatchEntryMatch, ids: string[]) => {
      setSaveState("saving");
      const result = await saveMatchDraftAction(
        initial.matchdayId,
        ids,
        toDraft(match),
      );
      if (result.ok === false) {
        setSaveState("error");
        appToast.error(result.message);
        return;
      }
      setSaveState("idle");
      appToast.autosaved(
        initial.status === "published" ? "Match saved" : "Draft saved",
      );
      if (result.data?.matchId && match.id.startsWith("temp-")) {
        setMatches((prev) =>
          prev.map((m) =>
            m.matchNo === match.matchNo
              ? { ...m, id: result.data!.matchId }
              : m,
          ),
        );
      }
    },
    [initial.matchdayId, initial.status],
  );

  const debouncedMatch = useDebounced(
    (match: MatchEntryMatch, ids: string[]) => persistMatch(match, ids),
    800,
  );

  function toggleAttendee(playerId: string) {
    setAttendeeIds((prev) => {
      const next = prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId];
      debouncedAttendance(next);
      return next;
    });
  }

  function updateMatch(updated: MatchEntryMatch) {
    setMatches((prev) =>
      prev.map((m) => (m.matchNo === updated.matchNo ? updated : m)),
    );
    debouncedMatch(updated, attendeeIds);
  }

  async function handleAddMatch() {
    const result = await addEmptyMatchAction(initial.matchdayId);
    if (!toastActionResult(result, "Match added")) return;
    setMatches((prev) => [
      ...prev,
      emptyMatch(result.data!.matchNo, result.data!.matchId),
    ]);
  }

  async function handleCopyLineup(matchId: string) {
    const result = await copyLineupAction(initial.matchdayId, matchId);
    if (!toastActionResult(result, "Lineup copied")) return;
    router.refresh();
  }

  async function runWorkflow(
    fn: () => Promise<{ ok: boolean; message?: string }>,
    successMessage: string,
  ) {
    setWorkflowBusy(true);
    const result = await fn();
    setWorkflowBusy(false);
    if (result.ok === false) {
      appToast.error(result.message ?? "Action failed.");
      return;
    }
    appToast.success(successMessage);
    router.refresh();
  }

  async function handleDeleteMatch(matchId: string, matchNo: number) {
    if (!window.confirm(`Delete match ${matchNo}? This cannot be undone.`)) {
      return;
    }
    const result = await deleteMatchAction(initial.matchdayId, matchId);
    if (!toastActionResult(result, "Match deleted")) return;
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    router.refresh();
  }

  if (initial.status === "cancelled") {
    return (
      <p className="text-sm text-muted-foreground">
        This matchday is cancelled and cannot be edited.
      </p>
    );
  }

  const isPublished = initial.status === "published";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link
          href="/admin/matchdays"
          className="font-medium text-primary hover:underline"
        >
          ← Matchdays
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/matchdays/${initial.matchdayId}/inspector`}
            className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium hover:border-primary/40"
          >
            Scoring inspector
          </Link>
          {isPublished ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={workflowBusy}
                onClick={() =>
                  runWorkflow(
                    () => recalculateMatchdayAction(initial.matchdayId),
                    "Scores recalculated",
                  )
                }
              >
                Recalculate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={workflowBusy}
                onClick={() =>
                  runWorkflow(
                    () => unpublishMatchdayAction(initial.matchdayId),
                    "Gameweek unpublished",
                  )
                }
              >
                Unpublish
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={workflowBusy}
              onClick={() =>
                runWorkflow(
                  () => publishMatchdayAction(initial.matchdayId),
                  "Gameweek published",
                )
              }
            >
              Publish gameweek
            </Button>
          )}
        </div>
      </div>

      {isPublished ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          Published — edits autosave and recalculate player and manager scores.
        </p>
      ) : null}

      <div className="flex justify-end">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium capitalize",
            saveState === "saving" && "bg-muted text-muted-foreground",
            saveState === "error" && "bg-destructive/10 text-destructive",
            saveState === "idle" && "bg-muted/50 text-muted-foreground",
          )}
          role="status"
        >
          {saveState === "saving"
            ? isPublished
              ? "Saving…"
              : "Saving draft…"
            : saveState === "error"
              ? "Save failed"
              : "Autosave on"}
        </span>
      </div>

      <section>
        <SectionHeading title="Who played today?" />
        <div className="flex flex-wrap gap-2">
          {initial.players.map((player) => {
            const selected = attendeeIds.includes(player.id);
            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleAttendee(player.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card/50 text-muted-foreground hover:border-primary/30",
                )}
              >
                <PlayerAvatar
                  name={player.displayName}
                  avatarUrl={player.avatarUrl ?? undefined}
                  size="sm"
                />
                {player.displayName}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Matches"
          action={
            <Button type="button" size="sm" onClick={handleAddMatch}>
              <Plus className="size-4" aria-hidden />
              Add match
            </Button>
          }
        />

        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add the first match of the day.
          </p>
        ) : (
          matches.map((match) => (
            <MatchCardEditor
              key={match.id}
              match={match}
              players={initial.players}
              playerMap={playerMap}
              attendeeIds={attendeeIds}
              onChange={updateMatch}
              onCopyLineup={
                match.matchNo > 1 && !match.id.startsWith("temp-")
                  ? () => handleCopyLineup(match.id)
                  : undefined
              }
              onDelete={
                !match.id.startsWith("temp-")
                  ? () => handleDeleteMatch(match.id, match.matchNo)
                  : undefined
              }
            />
          ))
        )}
      </section>
    </div>
  );
}

function MatchCardEditor({
  match,
  players,
  playerMap,
  attendeeIds,
  onChange,
  onCopyLineup,
  onDelete,
}: {
  match: MatchEntryMatch;
  players: MatchdayEntryData["players"];
  playerMap: Map<string, MatchdayEntryData["players"][number]>;
  attendeeIds: string[];
  onChange: (match: MatchEntryMatch) => void;
  onCopyLineup?: () => void;
  onDelete?: () => void;
}) {
  function toggleSide(side: "A" | "B", playerId: string) {
    const key = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
    const current = match[key];
    const next = current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : [...current, playerId];
    onChange({ ...match, [key]: next });
  }

  function setScore(side: "A" | "B", value: number) {
    const score = Math.max(0, value);
    if (side === "A") {
      onChange({ ...match, scoreA: score });
    } else {
      onChange({ ...match, scoreB: score });
    }
  }

  function syncGoalsToScore(nextA: number, nextB: number) {
    let goals = [...match.goals];
    const countA = goals.filter((g) => g.side === "A").length;
    const countB = goals.filter((g) => g.side === "B").length;
    const firstA = match.sideAPlayerIds[0];
    const firstB = match.sideBPlayerIds[0];
    while (firstA && goals.filter((g) => g.side === "A").length < nextA) {
      goals.push({ side: "A", scorerId: firstA, assistId: null });
    }
    while (firstB && goals.filter((g) => g.side === "B").length < nextB) {
      goals.push({ side: "B", scorerId: firstB, assistId: null });
    }
    if (countA > nextA) {
      let removed = 0;
      goals = goals.filter((g) => {
        if (g.side === "A" && removed < countA - nextA) {
          removed++;
          return false;
        }
        return true;
      });
    }
    if (countB > nextB) {
      let removed = 0;
      goals = goals.filter((g) => {
        if (g.side === "B" && removed < countB - nextB) {
          removed++;
          return false;
        }
        return true;
      });
    }
    return goals;
  }

  function handleScoreChange(side: "A" | "B", raw: string) {
    const value = Number.parseInt(raw, 10);
    const score = Number.isFinite(value) ? value : 0;
    const nextA = side === "A" ? score : match.scoreA;
    const nextB = side === "B" ? score : match.scoreB;
    const goals = syncGoalsToScore(nextA, nextB);
    onChange({ ...match, scoreA: nextA, scoreB: nextB, goals });
  }

  const attendingPlayers = players.filter((p) => attendeeIds.includes(p.id));

  return (
    <article className="surface space-y-4 rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-lg font-semibold tabular-nums">
          Match {match.matchNo}
        </h3>
        <div className="flex flex-wrap gap-2">
          {onCopyLineup ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopyLineup}
            >
              <Copy className="size-3.5" aria-hidden />
              Copy previous lineup
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["A", "B"] as const).map((side) => {
          const ids = side === "A" ? match.sideAPlayerIds : match.sideBPlayerIds;
          const gkId =
            side === "A" ? match.sideAGoalkeeperId : match.sideBGoalkeeperId;
          return (
            <div key={side} className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Side {side}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {attendingPlayers.map((player) => {
                  const onSide = ids.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleSide(side, player.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        onSide
                          ? side === "A"
                            ? "bg-team-a/20 text-foreground"
                            : "bg-team-b/20 text-foreground"
                          : "bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {player.displayName}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Goalkeeper</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={gkId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    onChange({
                      ...match,
                      ...(side === "A"
                        ? { sideAGoalkeeperId: val }
                        : { sideBGoalkeeperId: val }),
                    });
                  }}
                >
                  <option value="">None</option>
                  {ids.map((id) => (
                    <option key={id} value={id}>
                      {playerMap.get(id)?.displayName ?? id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Score A</Label>
          <Input
            type="number"
            min={0}
            className="w-20 tabular-nums"
            value={match.scoreA}
            onChange={(e) => handleScoreChange("A", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Score B</Label>
          <Input
            type="number"
            min={0}
            className="w-20 tabular-nums"
            value={match.scoreB}
            onChange={(e) => handleScoreChange("B", e.target.value)}
          />
        </div>
        <div className="space-y-1 min-w-[10rem] flex-1">
          <Label>MVP</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={match.mvpPlayerId ?? ""}
            onChange={(e) =>
              onChange({
                ...match,
                mvpPlayerId: e.target.value || null,
              })
            }
          >
            <option value="">None</option>
            {[...match.sideAPlayerIds, ...match.sideBPlayerIds].map((id) => (
              <option key={id} value={id}>
                {playerMap.get(id)?.displayName ?? id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {match.goals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Goals</p>
          <ul className="space-y-2 text-sm">
            {match.goals.map((goal, index) => (
              <li key={index} className="flex flex-wrap gap-2">
                <span className="text-muted-foreground">Side {goal.side}</span>
                <select
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                  value={goal.scorerId}
                  onChange={(e) => {
                    const goals = [...match.goals];
                    goals[index] = { ...goal, scorerId: e.target.value };
                    onChange({ ...match, goals });
                  }}
                >
                  {(goal.side === "A"
                    ? match.sideAPlayerIds
                    : match.sideBPlayerIds
                  ).map((id) => (
                    <option key={id} value={id}>
                      {playerMap.get(id)?.displayName}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                  value={goal.assistId ?? ""}
                  onChange={(e) => {
                    const goals = [...match.goals];
                    goals[index] = {
                      ...goal,
                      assistId: e.target.value || null,
                    };
                    onChange({ ...match, goals });
                  }}
                >
                  <option value="">No assist</option>
                  {[...match.sideAPlayerIds, ...match.sideBPlayerIds].map(
                    (id) => (
                      <option key={id} value={id}>
                        {playerMap.get(id)?.displayName}
                      </option>
                    ),
                  )}
                </select>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

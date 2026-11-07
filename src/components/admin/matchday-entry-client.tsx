"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Copy,
  Footprints,
  Hand,
  Minus,
  Plus,
  ShieldAlert,
  Target,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
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
    incidents: [],
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
    incidents: match.incidents,
    mvpPlayerId: null,
  };
}

export function MatchdayEntryClient({
  initial,
}: {
  initial: MatchdayEntryData;
}) {
  const router = useRouter();
  const defaultAttendeeIds = useMemo(
    () => initial.players.map((p) => p.id),
    [initial.players],
  );
  const [attendeeIds, setAttendeeIds] = useState<string[]>(() =>
    initial.attendeeIds.length > 0 ? initial.attendeeIds : defaultAttendeeIds,
  );
  const [matches, setMatches] = useState<MatchEntryMatch[]>(
    initial.matches.length > 0 ? initial.matches : [],
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">(
    "idle",
  );
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    matchId: string;
    matchNo: number;
  } | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const playerMap = useMemo(
    () => new Map(initial.players.map((p) => [p.id, p])),
    [initial.players],
  );

  const persistAttendance = useCallback(
    async (ids: string[], options?: { silent?: boolean }) => {
      if (!options?.silent) setSaveState("saving");
      const result = await saveMatchdayAttendanceAction(
        initial.matchdayId,
        ids,
      );
      if (result.ok === false) {
        setSaveState("error");
        appToast.error(result.message);
        return;
      }
      if (!options?.silent) {
        setSaveState("idle");
        appToast.autosaved("Attendance saved");
      }
    },
    [initial.matchdayId],
  );

  const debouncedAttendance = useDebounced(persistAttendance, 600);

  const seededAttendance = useRef(initial.attendeeIds.length === 0);
  useEffect(() => {
    if (!seededAttendance.current || defaultAttendeeIds.length === 0) return;
    seededAttendance.current = false;
    void persistAttendance(defaultAttendeeIds, { silent: true });
  }, [defaultAttendeeIds, persistAttendance]);

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

  async function confirmDeleteMatch() {
    if (!deleteTarget) return;
    setDeletePending(true);
    const { matchId } = deleteTarget;
    const result = await deleteMatchAction(initial.matchdayId, matchId);
    setDeletePending(false);
    if (!toastActionResult(result, "Match deleted")) return;
    setDeleteTarget(null);
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
      <ConfirmDialog
        open={deleteTarget != null}
        title={
          deleteTarget
            ? `Delete match ${deleteTarget.matchNo}?`
            : "Delete match?"
        }
        description="This removes the match, lineups, and goals. This cannot be undone."
        confirmLabel="Delete match"
        cancelLabel="Keep match"
        destructive
        pending={deletePending}
        onConfirm={() => void confirmDeleteMatch()}
        onCancel={() => {
          if (!deletePending) setDeleteTarget(null);
        }}
      />
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

        <p className="text-sm text-muted-foreground">
          Sides can be uneven (e.g. 5v4 or 4v4). Not everyone who attended has
          to be in every match.
        </p>
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
                  ? () =>
                      setDeleteTarget({
                        matchId: match.id,
                        matchNo: match.matchNo,
                      })
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
    const otherKey = side === "A" ? "sideBPlayerIds" : "sideAPlayerIds";
    const current = match[key];
    const adding = !current.includes(playerId);
    const next = adding
      ? [...current, playerId]
      : current.filter((id) => id !== playerId);
    const patch: Partial<MatchEntryMatch> = { [key]: next };
    // Penalty saves / handballs belong to a side: drop them if the player moves.
    patch.incidents = match.incidents.filter((i) => i.playerId !== playerId);
    if (adding) {
      patch[otherKey] = match[otherKey].filter((id) => id !== playerId);
      if (side === "A" && match.sideBGoalkeeperId === playerId) {
        patch.sideBGoalkeeperId = null;
      }
      if (side === "B" && match.sideAGoalkeeperId === playerId) {
        patch.sideAGoalkeeperId = null;
      }
    } else {
      if (side === "A" && match.sideAGoalkeeperId === playerId) {
        patch.sideAGoalkeeperId = null;
      }
      if (side === "B" && match.sideBGoalkeeperId === playerId) {
        patch.sideBGoalkeeperId = null;
      }
    }
    onChange({ ...match, ...patch });
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
  const unassigned = attendingPlayers.filter(
    (p) =>
      !match.sideAPlayerIds.includes(p.id) &&
      !match.sideBPlayerIds.includes(p.id),
  );
  const isDraw = match.scoreA === match.scoreB;
  const leading = match.scoreA > match.scoreB ? "A" : "B";

  function nameOf(id: string) {
    return playerMap.get(id)?.displayName ?? id;
  }

  function updateGoal(
    index: number,
    patch: Partial<MatchEntryMatch["goals"][number]>,
  ) {
    const goals = [...match.goals];
    goals[index] = { ...goals[index]!, ...patch };
    onChange({ ...match, goals });
  }

  /** Change a goal's type; own goals are scored by the OTHER side's player. */
  function setGoalKind(index: number, kind: GoalKindValue) {
    const goal = match.goals[index]!;
    const scoringIds =
      goal.side === "A" ? match.sideAPlayerIds : match.sideBPlayerIds;
    const concedingIds =
      goal.side === "A" ? match.sideBPlayerIds : match.sideAPlayerIds;
    const pool = kind === "own_goal" ? concedingIds : scoringIds;
    updateGoal(index, {
      kind,
      scorerId: pool.includes(goal.scorerId)
        ? goal.scorerId
        : (pool[0] ?? goal.scorerId),
      assistId: kind === "open_play" ? goal.assistId : null,
    });
  }

  function addIncident(side: "A" | "B", kind: IncidentKindValue) {
    const ids = side === "A" ? match.sideAPlayerIds : match.sideBPlayerIds;
    const gk = side === "A" ? match.sideAGoalkeeperId : match.sideBGoalkeeperId;
    const playerId =
      kind === "penalty_saved"
        ? (gk ?? ids[0])
        : kind === "penalty_missed"
          ? (ids.find((id) => id !== gk) ?? ids[0])
          : (ids[0] ?? null);
    if (!playerId) return;
    onChange({
      ...match,
      incidents: [...match.incidents, { kind, side, playerId }],
    });
  }

  function updateIncident(index: number, playerId: string) {
    const incidents = [...match.incidents];
    incidents[index] = { ...incidents[index]!, playerId };
    onChange({ ...match, incidents });
  }

  function removeIncident(index: number) {
    onChange({
      ...match,
      incidents: match.incidents.filter((_, i) => i !== index),
    });
  }

  return (
    <article className="surface space-y-6 rounded-3xl p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading flex items-center gap-2.5 text-xl font-semibold tabular-nums">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-sm text-primary">
            {match.matchNo}
          </span>
          Match {match.matchNo}
        </h3>
        <div className="flex items-center gap-1.5">
          {onCopyLineup ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCopyLineup}
            >
              <Copy className="size-3.5" aria-hidden />
              Copy previous lineup
            </Button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete match ${match.matchNo}`}
              title="Delete match"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </header>

      {/* Scoreboard */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-background/40 p-3 sm:gap-6 sm:p-4">
        {(["A", "B"] as const).map((side) => {
          const score = side === "A" ? match.scoreA : match.scoreB;
          const winning = !isDraw && leading === side;
          const stepper = (
            <ScoreStepper
              side={side}
              score={score}
              winning={winning}
              onChange={(n) => handleScoreChange(side, String(n))}
            />
          );
          return side === "A" ? (
            <div key={side} className="contents">
              {stepper}
              <span
                aria-hidden
                className="font-heading text-sm font-semibold tracking-widest text-muted-foreground"
              >
                VS
              </span>
            </div>
          ) : (
            <div key={side} className="contents">
              {stepper}
            </div>
          );
        })}
      </div>

      {/* Unassigned pool */}
      <section aria-label="Unassigned players" className="space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {unassigned.length > 0
            ? `Unassigned · tap A or B (${unassigned.length})`
            : "Everyone is assigned"}
        </p>
        {unassigned.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {unassigned.map((player) => (
              <li
                key={player.id}
                className="animate-pop inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 py-1 pr-1 pl-3 text-sm"
              >
                {player.displayName}
                {(["A", "B"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => toggleSide(side, player.id)}
                    aria-label={`Add ${player.displayName} to side ${side}`}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-[0.7rem] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
                      SIDE_STYLES[side].pill,
                    )}
                  >
                    {side}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Side columns: roster, keeper, goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(["A", "B"] as const).map((side) => {
          const st = SIDE_STYLES[side];
          const ids =
            side === "A" ? match.sideAPlayerIds : match.sideBPlayerIds;
          const gkId =
            side === "A" ? match.sideAGoalkeeperId : match.sideBGoalkeeperId;
          const score = side === "A" ? match.scoreA : match.scoreB;
          const sideGoals = match.goals
            .map((goal, index) => ({ goal, index }))
            .filter((g) => g.goal.side === side);
          const otherIds =
            side === "A" ? match.sideBPlayerIds : match.sideAPlayerIds;
          const sideIncidents = match.incidents
            .map((incident, index) => ({ incident, index }))
            .filter((i) => i.incident.side === side);

          return (
            <section
              key={side}
              aria-label={`Side ${side}`}
              className={cn(
                "@container space-y-5 rounded-2xl border p-4 sm:p-5",
                st.panel,
              )}
            >
              <h4
                className={cn(
                  "flex items-center gap-2 text-sm font-semibold tracking-widest uppercase",
                  st.text,
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", st.dot)}
                />
                Side {side}
                <span className="font-normal text-muted-foreground normal-case tracking-normal">
                  · {ids.length} player{ids.length === 1 ? "" : "s"}
                </span>
              </h4>

              {ids.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-sm text-muted-foreground">
                  Assign players from the list above.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {ids.map((id) => {
                    const isGk = gkId === id;
                    return (
                      <li
                        key={id}
                        className={cn(
                          "animate-pop inline-flex items-center gap-0.5 rounded-full border py-0.5 pr-1 pl-3 text-sm font-medium",
                          st.chip,
                        )}
                      >
                        {nameOf(id)}
                        <button
                          type="button"
                          aria-pressed={isGk}
                          aria-label={
                            isGk
                              ? `${nameOf(id)} is goalkeeper — tap to unset`
                              : `Make ${nameOf(id)} goalkeeper`
                          }
                          title="Goalkeeper"
                          onClick={() =>
                            onChange({
                              ...match,
                              ...(side === "A"
                                ? { sideAGoalkeeperId: isGk ? null : id }
                                : { sideBGoalkeeperId: isGk ? null : id }),
                            })
                          }
                          className={cn(
                            "ml-1 flex h-6 items-center gap-1 rounded-full px-1.5 text-[0.65rem] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isGk
                              ? "bg-podium-gold text-black"
                              : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
                          )}
                        >
                          <Hand className="size-3" aria-hidden />
                          {isGk ? "GK" : null}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${nameOf(id)} from side ${side}`}
                          onClick={() => toggleSide(side, id)}
                          className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Goals
                  </h5>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                      sideGoals.length === score
                        ? "bg-primary/15 text-primary"
                        : "bg-amber-500/15 text-amber-500",
                    )}
                    title="Goals logged / score"
                  >
                    {sideGoals.length} / {score}
                  </span>
                </div>
                {sideGoals.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-sm text-muted-foreground">
                    {score > 0
                      ? "Add players to this side to log who scored."
                      : "No goals yet. Raise the score to add one."}
                  </p>
                ) : (
                  <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50 bg-background/30">
                    {sideGoals.map(({ goal, index }, n) => {
                      const kind: GoalKindValue = goal.kind ?? "open_play";
                      const scorerPool = kind === "own_goal" ? otherIds : ids;
                      return (
                        <li
                          key={index}
                          className="animate-rise grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-2.5 @md:grid-cols-[1.25rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem]"
                        >
                          <span className="text-center text-xs font-semibold text-muted-foreground tabular-nums">
                            {n + 1}
                          </span>
                          <PlayerSelect
                            compact
                            icon={<Target />}
                            label={
                              kind === "own_goal"
                                ? `Goal ${n + 1} own goal by`
                                : `Goal ${n + 1} scorer`
                            }
                            value={goal.scorerId}
                            onChange={(v) =>
                              updateGoal(index, {
                                scorerId: v,
                                assistId:
                                  goal.assistId === v ? null : goal.assistId,
                              })
                            }
                          >
                            {scorerPool.map((id) => (
                              <option key={id} value={id}>
                                {kind === "own_goal"
                                  ? `${nameOf(id)} (OG)`
                                  : nameOf(id)}
                              </option>
                            ))}
                          </PlayerSelect>
                          {/* Type: compact select on the first row (narrow) / last column (wide). */}
                          <div className="@md:order-last">
                            <GoalKindSelect
                              label={`Goal ${n + 1} type`}
                              value={kind}
                              onChange={(v) => setGoalKind(index, v)}
                            />
                          </div>
                          <div className="col-span-2 col-start-2 @md:col-span-1 @md:col-start-auto">
                            {kind === "open_play" ? (
                              <PlayerSelect
                                compact
                                icon={<Footprints />}
                                label={`Goal ${n + 1} assist`}
                                value={goal.assistId ?? ""}
                                onChange={(v) =>
                                  updateGoal(index, { assistId: v || null })
                                }
                                muted={!goal.assistId}
                              >
                                <option value="">No assist</option>
                                {ids
                                  .filter((id) => id !== goal.scorerId)
                                  .map((id) => (
                                    <option key={id} value={id}>
                                      {nameOf(id)}
                                    </option>
                                  ))}
                              </PlayerSelect>
                            ) : (
                              <p className="flex h-9 items-center rounded-xl border border-dashed border-border/60 px-3 text-xs text-muted-foreground">
                                {kind === "penalty"
                                  ? "Penalty: no assist"
                                  : "Counts for the other side"}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-2.5">
                <h5 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Incidents
                </h5>
                {sideIncidents.length > 0 ? (
                  <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50 bg-background/30">
                    {sideIncidents.map(({ incident, index }) => (
                      <li
                        key={index}
                        className="animate-rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5"
                      >
                        <PlayerSelect
                          compact
                          icon={
                            incident.kind === "penalty_saved" ? (
                              <ShieldAlert />
                            ) : (
                              <Hand />
                            )
                          }
                          label={
                            incident.kind === "penalty_saved"
                              ? "Penalty saved by"
                              : "Handball by"
                          }
                          value={incident.playerId}
                          onChange={(v) => updateIncident(index, v)}
                        >
                          {ids.map((id) => (
                            <option key={id} value={id}>
                              {incident.kind === "penalty_saved"
                                ? `${nameOf(id)} · penalty saved`
                                : `${nameOf(id)} · handball (goal stopped)`}
                            </option>
                          ))}
                        </PlayerSelect>
                        <button
                          type="button"
                          aria-label="Remove incident"
                          onClick={() => removeIncident(index)}
                          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors outline-none hover:bg-destructive/15 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={ids.length === 0}
                    onClick={() => addIncident(side, "penalty_saved")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Penalty saved
                  </button>
                  <button
                    type="button"
                    disabled={ids.length === 0}
                    onClick={() => addIncident(side, "handball_blocked")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors outline-none hover:border-destructive/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Handball stopped a goal
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

type GoalKindValue = "open_play" | "penalty" | "own_goal";
type IncidentKindValue =
  "penalty_saved" | "handball_blocked" | "penalty_missed";

const GOAL_KIND_OPTIONS: { value: GoalKindValue; label: string }[] = [
  { value: "open_play", label: "Goal" },
  { value: "penalty", label: "Penalty" },
  { value: "own_goal", label: "Own goal" },
];

const SIDE_STYLES = {
  A: {
    text: "text-team-a",
    dot: "bg-team-a",
    panel: "border-team-a/25 bg-team-a/[0.04]",
    chip: "border-team-a/35 bg-team-a/15",
    pill: "bg-team-a/20 text-team-a hover:bg-team-a hover:text-black",
    ring: "ring-team-a/40",
  },
  B: {
    text: "text-team-b",
    dot: "bg-team-b",
    panel: "border-team-b/25 bg-team-b/[0.04]",
    chip: "border-team-b/35 bg-team-b/15",
    pill: "bg-team-b/20 text-team-b hover:bg-team-b hover:text-black",
    ring: "ring-team-b/40",
  },
} as const;

function ScoreStepper({
  side,
  score,
  winning,
  onChange,
}: {
  side: "A" | "B";
  score: number;
  winning: boolean;
  onChange: (next: number) => void;
}) {
  const st = SIDE_STYLES[side];
  const btn =
    "flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-foreground transition-all outline-none hover:border-primary/40 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:opacity-40 disabled:hover:border-border/60 disabled:hover:bg-card/70";

  return (
    <div className="flex flex-col items-center gap-2">
      <p
        className={cn(
          "text-xs font-semibold tracking-widest uppercase",
          st.text,
        )}
      >
        Side {side}
      </p>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          className={btn}
          disabled={score <= 0}
          aria-label={`Decrease side ${side} score`}
          onClick={() => onChange(Math.max(0, score - 1))}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <output
          key={score}
          aria-live="polite"
          aria-label={`Side ${side} score`}
          className={cn(
            "animate-pop font-heading min-w-[1.6ch] text-center text-5xl font-bold tabular-nums transition-colors sm:text-6xl",
            winning ? st.text : "text-foreground",
          )}
        >
          {score}
        </output>
        <button
          type="button"
          className={btn}
          aria-label={`Increase side ${side} score`}
          onClick={() => onChange(score + 1)}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Compact goal-type picker; non-standard goals are colour-coded. */
function GoalKindSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: GoalKindValue;
  onChange: (value: GoalKindValue) => void;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as GoalKindValue)}
        className={cn(
          "h-9 w-full appearance-none rounded-xl border bg-background/50 pr-7 pl-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          value === "open_play" &&
            "border-input text-foreground hover:border-foreground/25",
          value === "penalty" && "border-primary/50 bg-primary/10 text-primary",
          value === "own_goal" &&
            "border-destructive/50 bg-destructive/10 text-destructive",
        )}
      >
        {GOAL_KIND_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 opacity-70"
        aria-hidden
      />
    </div>
  );
}

function PlayerSelect({
  icon,
  label,
  value,
  onChange,
  muted,
  compact,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  muted?: boolean;
  /** Shorter control for dense rows. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-w-0">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-3.5"
      >
        {icon}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          compact ? "h-9" : "h-10",
          "w-full min-w-0 appearance-none rounded-xl border border-input bg-background/50 pr-7 pl-8 text-sm transition-colors outline-none hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          muted && "text-muted-foreground",
        )}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

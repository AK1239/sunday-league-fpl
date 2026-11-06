"use client";

import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  Loader2,
  MoreHorizontal,
  Activity,
  Pencil,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useActionResultToast } from "@/hooks/use-action-result-toast";
import { toastActionResult } from "@/lib/app-toast";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/server/actions/action-result";
import {
  cancelMatchdayAction,
  postponeMatchdayAction,
  updateMatchdayDeadlineAction,
} from "@/server/actions/matchdays";

export type MatchdayCardData = {
  id: string;
  number: number;
  playedOn: string;
  deadlineLocal: string;
  status: string;
};

async function deadlineAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return updateMatchdayDeadlineAction(formData);
}

async function postponeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult | null> {
  return postponeMatchdayAction(formData);
}

const STATUS_STYLES: Record<string, { pill: string; dot: string }> = {
  scheduled: { pill: "bg-primary/15 text-primary", dot: "bg-primary" },
  published: {
    pill: "bg-emerald-400/15 text-emerald-400",
    dot: "bg-emerald-400",
  },
  cancelled: {
    pill: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
  draft: { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

/** "Sun 8 Nov, 16:00" from a league-local `YYYY-MM-DDTHH:mm` string. */
function formatDeadline(local: string) {
  const d = new Date(`${local}:00Z`);
  if (Number.isNaN(d.getTime())) return local;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatShortDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function MatchdayCard({
  matchday,
  timezone,
  index,
  compact = false,
}: {
  matchday: MatchdayCardData;
  timezone: string;
  index: number;
  /** One-line row for long lists; the full card is for the gameweek you're working on. */
  compact?: boolean;
}) {
  const { status } = matchday;
  const cancelled = status === "cancelled";
  const canPostpone = status === "scheduled" || status === "draft";
  const published = status === "published";
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.draft!;

  const [deadlineState, deadlineFormAction, deadlinePending] = useActionState(
    deadlineAction,
    null,
  );
  const [postponeState, postponeFormAction, postponePending] = useActionState(
    postponeAction,
    null,
  );
  useActionResultToast(deadlineState, "Deadline updated");
  useActionResultToast(postponeState, "Matchday postponed");

  // null = untouched, so the field always follows the server value until edited.
  const [editedDeadline, setEditedDeadline] = useState<string | null>(null);
  const deadline = editedDeadline ?? matchday.deadlineLocal;
  const [showPostpone, setShowPostpone] = useState(false);
  const [seenPostponeState, setSeenPostponeState] = useState(postponeState);
  if (postponeState !== seenPostponeState) {
    setSeenPostponeState(postponeState);
    if (postponeState?.ok) setShowPostpone(false);
  }
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const [confirmCancel, setConfirmCancel] = useState(false);

  async function doCancel() {
    setCancelPending(true);
    const result = await cancelMatchdayAction(matchday.id);
    setCancelPending(false);
    setConfirmCancel(false);
    toastActionResult(result, "Matchday cancelled");
  }

  function onCancel() {
    setMenuOpen(false);
    setConfirmCancel(true);
  }

  const dirty =
    editedDeadline !== null && editedDeadline !== matchday.deadlineLocal;
  const menuItem =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted";

  const menuNode = (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`More actions for gameweek ${matchday.number}`}
        onClick={() => setMenuOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {cancelPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <MoreHorizontal className="size-5" aria-hidden />
        )}
      </button>
      {menuOpen ? (
        <div
          role="menu"
          className="glass animate-pop absolute right-0 z-20 mt-1.5 w-52 origin-top-right rounded-2xl bg-popover/95 p-1.5"
        >
          {canPostpone ? (
            <button
              type="button"
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setMenuOpen(false);
                setShowPostpone(true);
              }}
            >
              <CalendarClock
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              Postpone…
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={cn(menuItem, "text-destructive")}
            onClick={onCancel}
          >
            <XCircle className="size-4" aria-hidden />
            Cancel gameweek
          </button>
        </div>
      ) : null}
    </div>
  );

  const postponeNode = (
    <form
      action={postponeFormAction}
      className="animate-rise flex flex-wrap items-end gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4"
    >
      <input type="hidden" name="matchdayId" value={matchday.id} />
      <div className="space-y-2">
        <label
          htmlFor={`postpone-${matchday.id}`}
          className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
        >
          New Sunday date
        </label>
        <Input
          id={`postpone-${matchday.id}`}
          name="playedOn"
          type="date"
          defaultValue={matchday.playedOn}
          required
          disabled={postponePending}
          className="h-10"
        />
      </div>
      <Button type="submit" disabled={postponePending}>
        {postponePending ? "Updating…" : "Apply new date"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowPostpone(false)}
      >
        Cancel
      </Button>
    </form>
  );

  const cancelDialog = (
    <ConfirmDialog
      open={confirmCancel}
      title={`Cancel GW${matchday.number}?`}
      description="This removes it from scoring."
      confirmLabel="Cancel gameweek"
      cancelLabel="Keep it"
      destructive
      pending={cancelPending}
      onCancel={() => setConfirmCancel(false)}
      onConfirm={doCancel}
    />
  );

  const statusPill = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles.pill,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", styles.dot)} />
      {status}
    </span>
  );

  if (compact) {
    const showDeadlineForm = editingDeadline || dirty;
    return (
      <li
        className="animate-rise"
        style={{ "--d": `${Math.min(index, 8) * 40}ms` } as React.CSSProperties}
      >
        <article
          className={cn(
            "surface rounded-2xl px-4 py-3",
            cancelled && "opacity-60",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 md:flex-nowrap">
            <div
              aria-hidden
              className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/20 to-primary/5"
            >
              <span className="text-[0.55rem] leading-none font-semibold tracking-widest text-primary uppercase">
                GW
              </span>
              <span className="font-heading text-lg leading-none font-bold tabular-nums">
                {matchday.number}
              </span>
            </div>

            <div className="min-w-0 flex-1 md:flex-initial md:basis-56">
              <p className="font-heading truncate text-base leading-tight font-semibold">
                Gameweek {matchday.number}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{formatShortDay(matchday.playedOn)}</span>
                {statusPill}
              </p>
            </div>

            {!cancelled ? (
              <div className="order-last flex w-full items-center gap-2 text-sm md:order-none md:w-auto md:flex-1">
                <CalendarClock
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-medium tabular-nums">
                  {formatDeadline(deadline)}
                </span>
                {!published ? (
                  <button
                    type="button"
                    aria-label={`Edit deadline for gameweek ${matchday.number}`}
                    aria-expanded={showDeadlineForm}
                    onClick={() => setEditingDeadline((v) => !v)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {!cancelled ? (
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {published ? (
                  <Link
                    href={`/admin/matchdays/${matchday.id}/inspector`}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                    )}
                  >
                    <Activity aria-hidden />
                    <span className="hidden lg:inline">Inspector</span>
                  </Link>
                ) : null}
                <Link
                  href={`/admin/matchdays/${matchday.id}/entry`}
                  className={cn(
                    buttonVariants({
                      variant: published ? "secondary" : "default",
                      size: "sm",
                    }),
                    "group/cta",
                  )}
                >
                  {published ? "Edit results" : "Enter results"}
                  <ArrowRight
                    className="transition-transform group-hover/cta:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
                {menuNode}
              </div>
            ) : null}
          </div>

          {showDeadlineForm && !cancelled ? (
            <form
              action={deadlineFormAction}
              className="animate-rise mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3"
            >
              <input type="hidden" name="matchdayId" value={matchday.id} />
              <label
                htmlFor={`deadline-${matchday.id}`}
                className="text-xs font-medium tracking-widest text-muted-foreground uppercase"
              >
                New deadline
                <span className="font-normal tracking-normal normal-case">
                  {" "}
                  · {timezone}
                </span>
              </label>
              <Input
                id={`deadline-${matchday.id}`}
                name="deadlineAtLocal"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setEditedDeadline(e.target.value)}
                disabled={deadlinePending}
                className="h-9 w-full min-w-0 sm:w-[15rem]"
              />
              <div className="flex gap-1.5">
                <Button
                  type="submit"
                  size="sm"
                  disabled={deadlinePending || !dirty}
                >
                  {deadlinePending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Check aria-hidden />
                  )}
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditedDeadline(null);
                    setEditingDeadline(false);
                  }}
                >
                  {dirty ? "Reset" : "Close"}
                </Button>
              </div>
            </form>
          ) : null}

          {showPostpone ? postponeNode : null}
        </article>
        {cancelDialog}
      </li>
    );
  }

  return (
    <li
      className="animate-rise"
      style={{ "--d": `${Math.min(index, 8) * 60}ms` } as React.CSSProperties}
    >
      <article
        className={cn(
          "surface space-y-5 rounded-3xl p-5",
          cancelled && "opacity-60",
        )}
      >
        <header className="flex items-start gap-4">
          <div
            aria-hidden
            className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/20 to-primary/5"
          >
            <span className="text-[0.6rem] font-semibold tracking-widest text-primary uppercase">
              GW
            </span>
            <span className="font-heading -mt-0.5 text-2xl leading-none font-bold tabular-nums">
              {matchday.number}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-xl font-semibold">
              Gameweek {matchday.number}
            </h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden />
                {formatDay(matchday.playedOn)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                  styles.pill,
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", styles.dot)}
                />
                {status}
              </span>
            </p>
          </div>

          {!cancelled ? menuNode : null}
        </header>

        {!cancelled ? (
          <div className="grid gap-4 border-t border-border/50 pt-4 md:grid-cols-[1fr_auto] md:items-end">
            <form action={deadlineFormAction} className="space-y-2">
              <input type="hidden" name="matchdayId" value={matchday.id} />
              <label
                htmlFor={`deadline-${matchday.id}`}
                className="flex items-center gap-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase"
              >
                <CalendarClock className="size-3.5" aria-hidden />
                Pick deadline
                <span className="font-normal tracking-normal normal-case">
                  · {timezone}
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  id={`deadline-${matchday.id}`}
                  name="deadlineAtLocal"
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setEditedDeadline(e.target.value)}
                  disabled={deadlinePending}
                  className="h-10 min-w-0 flex-1 sm:max-w-[16rem]"
                />
                {dirty ? (
                  <div className="animate-pop flex gap-1.5">
                    <Button type="submit" disabled={deadlinePending}>
                      {deadlinePending ? (
                        <Loader2 className="animate-spin" aria-hidden />
                      ) : (
                        <Check aria-hidden />
                      )}
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditedDeadline(null)}
                    >
                      Reset
                    </Button>
                  </div>
                ) : null}
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {published ? (
                <Link
                  href={`/admin/matchdays/${matchday.id}/inspector`}
                  className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
                >
                  <Activity aria-hidden />
                  Scoring inspector
                </Link>
              ) : null}
              <Link
                href={`/admin/matchdays/${matchday.id}/entry`}
                className={cn(
                  buttonVariants({
                    variant: published ? "secondary" : "default",
                  }),
                  "group/cta h-10 px-4",
                )}
              >
                {published ? "Edit results" : "Enter results"}
                <ArrowRight
                  className="transition-transform group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>
          </div>
        ) : null}

        {showPostpone ? postponeNode : null}
      </article>
      {cancelDialog}
    </li>
  );
}

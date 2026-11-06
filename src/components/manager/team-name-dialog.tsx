"use client";

import { Pencil, Shirt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { BottomSheet } from "@/components/pick/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appToast } from "@/lib/app-toast";
import { TEAM_NAME_MAX, normalizeTeamName } from "@/lib/team-name";
import { setTeamNameAction } from "@/server/actions/team-name";

/** Sheet for choosing (or changing) the manager's team name. */
export function TeamNameDialog({
  open,
  onClose,
  initialName = "",
  onSkip,
}: {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  /** When set, shows a "Skip for now" action (first-time prompt). */
  onSkip?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = initialName.length > 0;

  function submit() {
    const parsed = normalizeTeamName(name);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await setTeamNameAction(parsed.value);
      if (result.ok === false) {
        setError(result.message);
        return;
      }
      appToast.success(`Team name saved: ${result.data.teamName}`);
      onClose();
      router.refresh();
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={editing ? "Rename your team" : "Name your team"}
      description="Shown on the league table instead of your own name."
      leading={
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"
        >
          <Shirt className="size-5" />
        </span>
      }
    >
      <form
        className="space-y-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="team-name">Team name</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            maxLength={TEAM_NAME_MAX}
            placeholder="e.g. Sunday Wolves"
            autoComplete="off"
            autoFocus
            disabled={pending}
            aria-invalid={error ? true : undefined}
            aria-describedby="team-name-hint"
          />
          <p
            id="team-name-hint"
            role={error ? "alert" : undefined}
            className={
              error
                ? "text-sm text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {error ?? `2–${TEAM_NAME_MAX} characters. Must be unique.`}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onSkip ?? onClose}
          >
            {onSkip ? "Skip for now" : "Cancel"}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save team name"}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}

/**
 * Opens by itself once a manager has a saved team but no team name.
 * Skipping is remembered per user (it won't nag); My team always has a button.
 */
export function TeamNamePrompt({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const key = `fpl:team-name-prompt-skipped:${userId}`;

  useEffect(() => {
    let skipped = false;
    try {
      skipped = localStorage.getItem(key) === "1";
    } catch {
      /* storage unavailable: still prompt */
    }
    if (skipped) return;
    // Slight delay so it lands after the "Team saved" toast, not on top of it.
    const id = window.setTimeout(() => setOpen(true), 500);
    return () => window.clearTimeout(id);
  }, [key]);

  return (
    <TeamNameDialog
      open={open}
      onClose={() => setOpen(false)}
      onSkip={() => {
        try {
          localStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
        setOpen(false);
      }}
    />
  );
}

/** My team header control: shows the team name and lets the manager set or change it. */
export function TeamNameButton({ teamName }: { teamName: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3.5 py-1.5 text-sm font-medium transition-colors outline-none hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Shirt className="size-4 text-primary" aria-hidden />
        {teamName ? (
          <>
            <span className="max-w-[16rem] truncate">{teamName}</span>
            <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="sr-only">Rename team</span>
          </>
        ) : (
          <span className="text-primary">Name your team</span>
        )}
      </button>
      {/* Remount per open so the field starts from the current name. */}
      {open ? (
        <TeamNameDialog
          open
          onClose={() => setOpen(false)}
          initialName={teamName ?? ""}
        />
      ) : null}
    </>
  );
}

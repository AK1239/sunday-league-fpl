"use client";

import {
  Armchair,
  Crown,
  Shuffle,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionHeading } from "@/components/fantasy/section-heading";
import { toastActionResult } from "@/lib/app-toast";
import {
  forceActivateChipAction,
  updateSeasonChipsAction,
  voidChipPlayAction,
} from "@/server/actions/admin-chips";
import type { AdminChipsPageData } from "@/server/queries/admin-chips-page";
import { Button } from "@/components/ui/button";
import { CHIP_REGISTRY } from "@/server/chips/registry";
import type { ChipCode } from "@/server/chips/registry";

const CHIP_META: Record<string, { icon: LucideIcon; blurb: string }> = {
  bench_boost: { icon: Armchair, blurb: "2 extra players score too." },
  free_hit: {
    icon: Zap,
    blurb: "Unlimited transfers for one week, then revert.",
  },
  triple_captain: { icon: Crown, blurb: "Captain scores triple points." },
  wildcard: {
    icon: Shuffle,
    blurb: "Unlimited free transfers, kept for good.",
  },
};

function chipLabel(code: string): string {
  return isChipCodeSafe(code)
    ? CHIP_REGISTRY[code].label
    : code.replace(/_/g, " ");
}

function isChipCodeSafe(code: string): code is ChipCode {
  return code in CHIP_REGISTRY;
}

export function AdminChipsClient({ data }: { data: AdminChipsPageData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [voidPlayId, setVoidPlayId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [forceOpen, setForceOpen] = useState(false);
  const [forceManagerId, setForceManagerId] = useState("");
  const [forceMatchdayId, setForceMatchdayId] = useState("");
  const [forceChip, setForceChip] = useState<string>(
    data.chipOptions[0]?.code ?? "",
  );
  const [forceReason, setForceReason] = useState("");

  function refresh() {
    router.refresh();
  }

  function submitVoid() {
    if (!voidPlayId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("playId", voidPlayId);
      fd.set("reason", voidReason);
      const result = await voidChipPlayAction(fd);
      if (toastActionResult(result, "Chip play voided (refunded)")) {
        setVoidPlayId(null);
        setVoidReason("");
        refresh();
      }
    });
  }

  function submitForce() {
    startTransition(async () => {
      const fd = buildForceFormData(
        forceManagerId,
        forceMatchdayId,
        forceChip,
        forceReason,
      );
      const result = await forceActivateChipAction(fd);
      if (toastActionResult(result, "Chip activated for manager")) {
        setForceOpen(false);
        setForceReason("");
        refresh();
      }
    });
  }

  function saveSeasonConfig() {
    const rows = data.seasonChips.map((row) => {
      const enabledEl = document.getElementById(
        `chip-enabled-${row.chipCode}`,
      ) as HTMLInputElement | null;
      const fromEl = document.getElementById(
        `chip-from-${row.chipCode}`,
      ) as HTMLInputElement | null;
      return {
        chipCode: row.chipCode,
        enabled: enabledEl?.checked,
        availableFromMatchday: fromEl?.value ? Number(fromEl.value) : undefined,
      };
    });

    startTransition(async () => {
      const fd = new FormData();
      fd.set("seasonId", data.seasonId);
      fd.set("rows", JSON.stringify(rows));
      const result = await updateSeasonChipsAction(fd);
      toastActionResult(result, "Season chip settings saved");
      refresh();
    });
  }

  return (
    <div className="space-y-8">
      {data.chipsEnabled ? (
        <section>
          <SectionHeading title="Season chip configuration" />
          {data.configLocked ? (
            <p className="text-sm text-muted-foreground">
              Locked — a gameweek has passed its deadline. Configuration cannot
              change until a new season.
            </p>
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.seasonChips.map((row) => {
                  const meta = CHIP_META[row.chipCode];
                  const Icon = meta?.icon ?? Sparkles;
                  return (
                    <li
                      key={row.chipCode}
                      className="surface group/row flex flex-col gap-4 rounded-2xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          aria-hidden
                          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/20 to-primary/5 text-primary"
                        >
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-heading text-lg leading-tight font-semibold">
                            {chipLabel(row.chipCode)}
                          </p>
                          {meta ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {meta.blurb}
                            </p>
                          ) : null}
                        </div>
                        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                          <input
                            id={`chip-enabled-${row.chipCode}`}
                            type="checkbox"
                            defaultChecked={row.enabled}
                            aria-label={`Enable ${chipLabel(row.chipCode)}`}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden
                            className="h-6 w-11 rounded-full bg-muted transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-foreground after:shadow after:transition-transform peer-checked:after:translate-x-5 peer-checked:after:bg-primary-foreground"
                          />
                        </label>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3 transition-opacity group-has-[input[type=checkbox]:not(:checked)]/row:opacity-50">
                        <label
                          htmlFor={`chip-from-${row.chipCode}`}
                          className="text-sm text-muted-foreground"
                        >
                          Available from gameweek
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold tracking-widest text-muted-foreground">
                            GW
                          </span>
                          <input
                            id={`chip-from-${row.chipCode}`}
                            type="number"
                            min={1}
                            defaultValue={row.availableFromMatchday}
                            className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-center font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                disabled={pending}
                onClick={saveSeasonConfig}
              >
                {pending ? "Saving…" : "Save configuration"}
              </Button>
            </>
          )}
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading title="Chip usage" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!data.chipsEnabled || pending}
            onClick={() => setForceOpen(true)}
          >
            Force activate…
          </Button>
        </div>

        {data.usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chip plays yet.</p>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">GW</th>
                  <th className="px-4 py-3 font-medium">Chip</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.usage.map((row) => (
                  <tr key={row.playId} className="border-b border-border/40">
                    <td className="px-4 py-2.5">{row.managerName}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {row.matchdayNumber}
                    </td>
                    <td className="px-4 py-2.5">{chipLabel(row.chipCode)}</td>
                    <td className="px-4 py-2.5 capitalize">{row.status}</td>
                    <td className="px-4 py-2.5 capitalize">{row.source}</td>
                    <td className="px-4 py-2.5 text-right">
                      {row.status === "active" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            setVoidPlayId(row.playId);
                            setVoidReason("");
                          }}
                        >
                          Void…
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.voidReason ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {voidPlayId ? (
        <div
          className="surface fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border p-4 shadow-lg sm:inset-x-auto sm:right-8 sm:bottom-8"
          role="dialog"
          aria-labelledby="void-chip-title"
        >
          <h3 id="void-chip-title" className="font-heading font-semibold">
            Void chip play
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Refunds the chip for the manager. Mirrors and squad artifacts are
            cleared when applicable.
          </p>
          <label className="mt-3 block text-sm">
            <span className="font-medium">Reason</span>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVoidPlayId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending || voidReason.trim().length < 3}
              onClick={submitVoid}
            >
              Void play
            </Button>
          </div>
        </div>
      ) : null}

      {forceOpen ? (
        <div
          className="surface fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-border p-4 shadow-lg sm:inset-x-auto sm:right-8 sm:bottom-8"
          role="dialog"
          aria-labelledby="force-chip-title"
        >
          <h3 id="force-chip-title" className="font-heading font-semibold">
            Force activate chip
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Records an admin chip play and updates the transfer window. Squad
            and extra players must still match via Transfers or manager submit.
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <label className="block">
              <span className="font-medium">Manager</span>
              <select
                value={forceManagerId}
                onChange={(e) => setForceManagerId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              >
                <option value="">Select…</option>
                {data.managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-medium">Gameweek</span>
              <select
                value={forceMatchdayId}
                onChange={(e) => setForceMatchdayId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              >
                <option value="">Select…</option>
                {data.matchdays.map((md) => (
                  <option key={md.id} value={md.id}>
                    GW {md.number} · {md.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-medium">Chip</span>
              <select
                value={forceChip}
                onChange={(e) => setForceChip(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              >
                {data.chipOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-medium">Reason</span>
              <textarea
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                pending ||
                !forceManagerId ||
                !forceMatchdayId ||
                forceReason.trim().length < 3
              }
              onClick={submitForce}
            >
              Activate
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildForceFormData(
  managerId: string,
  matchdayId: string,
  chipCode: string,
  reason: string,
): FormData {
  const fd = new FormData();
  fd.set("managerId", managerId);
  fd.set("matchdayId", matchdayId);
  fd.set("chipCode", chipCode);
  fd.set("reason", reason);
  return fd;
}

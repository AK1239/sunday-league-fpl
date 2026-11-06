"use client";

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

function chipLabel(code: string): string {
  return isChipCodeSafe(code) ? CHIP_REGISTRY[code].label : code.replace(/_/g, " ");
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
  const [forceChip, setForceChip] = useState<string>(data.chipOptions[0]?.code ?? "");
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
        availableFromMatchday: fromEl?.value
          ? Number(fromEl.value)
          : undefined,
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
              <div className="surface overflow-x-auto rounded-2xl">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Chip</th>
                      <th className="px-4 py-3 font-medium">Enabled</th>
                      <th className="px-4 py-3 font-medium tabular-nums">
                        From GW
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.seasonChips.map((row) => (
                      <tr
                        key={row.chipCode}
                        className="border-b border-border/40"
                      >
                        <td className="px-4 py-2.5 font-medium">
                          {chipLabel(row.chipCode)}
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            id={`chip-enabled-${row.chipCode}`}
                            type="checkbox"
                            defaultChecked={row.enabled}
                            className="size-4 rounded border-border"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            id={`chip-from-${row.chipCode}`}
                            type="number"
                            min={1}
                            defaultValue={row.availableFromMatchday}
                            className="w-20 rounded-lg border border-border bg-background px-2 py-1 tabular-nums"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={pending}
                onClick={saveSeasonConfig}
              >
                Save configuration
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
                    <td className="px-4 py-2.5 tabular-nums">{row.matchdayNumber}</td>
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
            and reserve must still match via Transfers or manager submit.
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

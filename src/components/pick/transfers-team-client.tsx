"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { appToast } from "@/lib/app-toast";
import { PlayerShirt } from "@/components/fantasy/player-shirt";
import { PageHeader } from "@/components/fantasy/page-header";
import { DeadlineCountdown } from "@/components/pick/deadline-countdown";
import { LockedBanner } from "@/components/pick/locked-banner";
import { PlayerPickerSheet } from "@/components/pick/player-picker-sheet";
import { SlotActionSheet } from "@/components/pick/slot-action-sheet";
import { TransferConfirmSheet } from "@/components/pick/transfer-confirm-sheet";
import { ActiveChipBanner } from "@/components/pick/active-chip-banner";
import { ExtraPlayersSheet } from "@/components/pick/extra-players-sheet";
import { TransferHistoryTab } from "@/components/pick/transfer-history-tab";
import { TransferPitchSlots } from "@/components/pick/transfer-pitch-slots";
import { TransferSummaryStrip } from "@/components/pick/transfer-summary-strip";
import {
  transferDraftStorageKey,
  type LocalTransferDraft,
  type SerializedTransferPageData,
} from "@/components/pick/transfer-types";
import { submitTeamAction } from "@/server/actions/submit-team";
import { diffSquads } from "@/server/fantasy/transfer-diff";
import { summariseTransferWindow } from "@/server/fantasy/transfer-summary";
import { BENCH_BOOST_EXTRA_COUNT } from "@/server/chips/bench-boost-extras";
import type { ChipCode } from "@/server/chips/registry";
import {
  validateEmptyBaseTransferPick,
  validateFantasyTeamTransferLineup,
  validateFantasyTeamTransferPick,
  validateInitialFantasyTeamBuild,
} from "@/server/fantasy/validate-transfers";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY_FIVE_SLOTS: (string | null)[] = [null, null, null, null, null];

function teamToSlots(playerIds: readonly string[]): (string | null)[] {
  const slots: (string | null)[] = [...EMPTY_FIVE_SLOTS];
  playerIds.slice(0, 5).forEach((id, index) => {
    slots[index] = id;
  });
  return slots;
}

function readLocalDraft(
  matchdayId: string,
  baseVersion: number,
): LocalTransferDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(transferDraftStorageKey(matchdayId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as LocalTransferDraft;
    if (draft.baseVersion !== baseVersion) return null;
    return draft;
  } catch {
    return null;
  }
}

function writeLocalDraft(matchdayId: string, draft: LocalTransferDraft) {
  try {
    localStorage.setItem(
      transferDraftStorageKey(matchdayId),
      JSON.stringify(draft),
    );
  } catch {
    /* ignore */
  }
}

function clearLocalDraft(matchdayId: string) {
  try {
    localStorage.removeItem(transferDraftStorageKey(matchdayId));
  } catch {
    /* ignore */
  }
}

type SavedTeamPick = {
  playerIds: readonly string[];
  captainPlayerId: string;
  viceCaptainPlayerId: string;
};

function teamPickMatchesSaved(
  playerIds: readonly string[],
  captainPlayerId: string | null,
  viceCaptainPlayerId: string | null,
  saved: SavedTeamPick | null | undefined,
): boolean {
  if (!saved || saved.playerIds.length !== 5 || playerIds.length !== 5) {
    return false;
  }
  if (captainPlayerId == null || viceCaptainPlayerId == null) return false;
  for (let i = 0; i < 5; i += 1) {
    if (playerIds[i] !== saved.playerIds[i]) return false;
  }
  return (
    captainPlayerId === saved.captainPlayerId &&
    viceCaptainPlayerId === saved.viceCaptainPlayerId
  );
}

export function TransfersTeamClient({
  initial,
}: {
  initial: Extract<SerializedTransferPageData, { mode: "transfers" }>;
}) {
  const router = useRouter();
  const pick = initial.pick;
  const isFirstSeasonGw = initial.isInitialBuild;
  const playerById = useMemo(
    () => new Map(pick.players.map((p) => [p.id, p])),
    [pick.players],
  );
  const basePlayerIds = initial.basePlayerIds;
  /** Prior GW squad from server, or this GW saved team when GW1 has no "before" row. */
  const permanentBasePlayerIds = useMemo(() => {
    if (basePlayerIds.length === 5) return basePlayerIds;
    if (pick.myTeam?.playerIds.length === 5) return pick.myTeam.playerIds;
    return [] as string[];
  }, [basePlayerIds, pick.myTeam]);
  /**
   * The whole first gameweek (no earlier squad) is a free build, like the
   * server treats it: no transfers, no penalty, edits stay free until the
   * deadline, even after a team has been saved.
   */
  const freeBuild = isFirstSeasonGw;

  const [teamVersion, setTeamVersion] = useState(initial.teamVersion);
  const [draftStaleNotice, setDraftStaleNotice] = useState(false);
  const [tab, setTab] = useState<"team" | "history">("team");
  const [chipCode, setChipCode] = useState<ChipCode | null>(
    () => initial.chips?.activeChipCode ?? null,
  );
  const [reservePlayerIds, setReservePlayerIds] = useState<string[]>(() => [
    ...(initial.chips?.savedReservePlayerIds ?? []),
  ]);
  const [extrasOpen, setExtrasOpen] = useState(false);

  // Initial state must match SSR — localStorage draft is restored in useEffect
  // so server and client markup agree on first paint (avoids hydration errors).
  const [slots, setSlots] = useState<(string | null)[]>(() => {
    return pick.myTeam?.playerIds.length === 5
      ? teamToSlots(pick.myTeam.playerIds)
      : freeBuild
        ? [...EMPTY_FIVE_SLOTS]
        : teamToSlots(permanentBasePlayerIds);
  });

  const [captainPlayerId, setCaptainPlayerId] = useState<string | null>(
    () =>
      pick.myTeam?.captainPlayerId ??
      (permanentBasePlayerIds.length === 5 ? permanentBasePlayerIds[0]! : null),
  );
  const [viceCaptainPlayerId, setViceCaptainPlayerId] = useState<string | null>(
    () =>
      pick.myTeam?.viceCaptainPlayerId ??
      (permanentBasePlayerIds.length === 5
        ? (permanentBasePlayerIds.find(
            (id) => id !== permanentBasePlayerIds[0],
          ) ?? null)
        : null),
  );

  const [pendingOutSlot, setPendingOutSlot] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [captaincyStep, setCaptaincyStep] = useState(false);

  const readOnly = pick.locked || !pick.selectionOpen;
  const savedTeam = pick.myTeam;

  useLayoutEffect(() => {
    const draft = readLocalDraft(pick.matchday.id, initial.teamVersion);
    if (draft?.playerIds.length === 5) {
      /* eslint-disable react-hooks/set-state-in-effect -- restore localStorage draft after first paint so SSR HTML matches client (hydration) */
      setSlots(teamToSlots(draft.playerIds));
      setCaptainPlayerId(draft.captainPlayerId);
      setViceCaptainPlayerId(draft.viceCaptainPlayerId);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const raw = localStorage.getItem(transferDraftStorageKey(pick.matchday.id));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LocalTransferDraft;
      if (parsed.baseVersion !== initial.teamVersion) {
        setDraftStaleNotice(true);
        clearLocalDraft(pick.matchday.id);
      }
    } catch {
      /* ignore */
    }
  }, [pick.matchday.id, initial.teamVersion]);

  // After a save (router.refresh) the server state replaces local state. Skip
  // the first run so a restored draft isn't immediately overwritten.
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    if (pick.myTeam?.playerIds.length === 5) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- adopt the server team after router.refresh(); intentional prop-to-state sync
      setSlots(teamToSlots(pick.myTeam.playerIds));
      setCaptainPlayerId(pick.myTeam.captainPlayerId);
      setViceCaptainPlayerId(pick.myTeam.viceCaptainPlayerId);
      setTeamVersion(initial.teamVersion);
    }
  }, [pick.myTeam, initial.teamVersion]);

  const plannedIds = useMemo(
    () => slots.filter((id): id is string => Boolean(id)),
    [slots],
  );

  const lineupBaseForValidation = useMemo(
    () =>
      freeBuild
        ? ([] as string[])
        : chipCode === "free_hit"
          ? basePlayerIds
          : permanentBasePlayerIds,
    [freeBuild, chipCode, basePlayerIds, permanentBasePlayerIds],
  );

  const diff = useMemo(
    () => diffSquads(lineupBaseForValidation, plannedIds),
    [lineupBaseForValidation, plannedIds],
  );
  const incomingIds = useMemo(() => new Set(diff.in), [diff.in]);

  const unlimitedTransfers = chipCode === "wildcard" || chipCode === "free_hit";

  const summary = useMemo(
    () =>
      summariseTransferWindow({
        baseSquad: lineupBaseForValidation,
        nextSquad: plannedIds,
        freeAvailable: initial.freeAvailable,
        penaltyPerExtra: initial.penaltyPerExtra,
        unlimited: unlimitedTransfers || freeBuild,
      }),
    [
      lineupBaseForValidation,
      plannedIds,
      initial.freeAvailable,
      initial.penaltyPerExtra,
      unlimitedTransfers,
      freeBuild,
    ],
  );

  const pickerWouldBeExtra = useMemo(() => {
    if (unlimitedTransfers || freeBuild || pendingOutSlot == null) return false;
    const hypotheticalMade = summary.made + 1;
    return hypotheticalMade > initial.freeAvailable;
  }, [
    unlimitedTransfers,
    freeBuild,
    pendingOutSlot,
    summary.made,
    initial.freeAvailable,
  ]);

  const matchesSavedTeam = useMemo(
    () =>
      teamPickMatchesSaved(
        plannedIds,
        captainPlayerId,
        viceCaptainPlayerId,
        savedTeam,
      ),
    [plannedIds, captainPlayerId, viceCaptainPlayerId, savedTeam],
  );

  const savedChipCodeOnServer = initial.chips?.activeChipCode ?? null;
  const savedExtrasOnServer = useMemo(
    () => initial.chips?.savedReservePlayerIds ?? [],
    [initial.chips?.savedReservePlayerIds],
  );

  /** Bench Boost extras; anyone moved into the five drops out automatically. */
  const extraIds = useMemo(
    () => reservePlayerIds.filter((id) => !plannedIds.includes(id)),
    [reservePlayerIds, plannedIds],
  );

  const chipDirty = useMemo(() => {
    if (chipCode !== savedChipCodeOnServer) return true;
    if (
      chipCode === "bench_boost" &&
      [...extraIds].sort().join(",") !==
        [...savedExtrasOnServer].sort().join(",")
    ) {
      return true;
    }
    return false;
  }, [chipCode, extraIds, savedChipCodeOnServer, savedExtrasOnServer]);

  const dirty =
    !savedTeam || !matchesSavedTeam || pendingOutSlot != null || chipDirty;
  const captaincyChanged =
    savedTeam != null &&
    (captainPlayerId !== savedTeam.captainPlayerId ||
      viceCaptainPlayerId !== savedTeam.viceCaptainPlayerId);

  useEffect(() => {
    if (readOnly) return;
    if (!dirty) {
      clearLocalDraft(pick.matchday.id);
      return;
    }
    if (plannedIds.length !== 5 || !captainPlayerId || !viceCaptainPlayerId) {
      return;
    }
    writeLocalDraft(pick.matchday.id, {
      baseVersion: teamVersion,
      playerIds: plannedIds,
      captainPlayerId,
      viceCaptainPlayerId,
    });
  }, [
    plannedIds,
    captainPlayerId,
    viceCaptainPlayerId,
    pick.matchday.id,
    readOnly,
    dirty,
    teamVersion,
  ]);

  const pickForValidation = useMemo(() => {
    if (plannedIds.length !== 5 || !captainPlayerId || !viceCaptainPlayerId) {
      return null;
    }
    return {
      playerIds: plannedIds,
      captainPlayerId,
      viceCaptainPlayerId,
    };
  }, [plannedIds, captainPlayerId, viceCaptainPlayerId]);

  const eligible = useMemo(
    () =>
      new Map(
        pick.players.map((p) => [p.id, { id: p.id, active: true } as const]),
      ),
    [pick.players],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- drop captain/vice who left the lineup; intentional derived-state reset
    setCaptainPlayerId((c) => (c && plannedIds.includes(c) ? c : null));
    setViceCaptainPlayerId((v) => (v && plannedIds.includes(v) ? v : null));
  }, [plannedIds]);

  useEffect(() => {
    if (
      captainPlayerId &&
      viceCaptainPlayerId &&
      captainPlayerId === viceCaptainPlayerId
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vice cannot equal captain; intentional derived-state reset
      setViceCaptainPlayerId(null);
    }
  }, [captainPlayerId, viceCaptainPlayerId]);

  const blockedMessage = useMemo(() => {
    if (readOnly || !dirty) return null;
    if (
      chipCode === "bench_boost" &&
      extraIds.length < BENCH_BOOST_EXTRA_COUNT &&
      chipDirty
    ) {
      return `Choose ${BENCH_BOOST_EXTRA_COUNT} extra players for Bench Boost, then tap Review.`;
    }
    if (pendingOutSlot != null) {
      return "Pick a replacement to finish this transfer.";
    }
    if (plannedIds.length !== 5) return "Your squad must have 5 players.";
    const lineup = validateFantasyTeamTransferLineup(
      plannedIds,
      lineupBaseForValidation,
      eligible,
    );
    if (!lineup.ok) return lineup.message;
    if (!captainPlayerId || !viceCaptainPlayerId) {
      return "Tap a player to choose your captain and vice-captain.";
    }
    return null;
  }, [
    readOnly,
    dirty,
    chipCode,
    extraIds,
    chipDirty,
    pendingOutSlot,
    plannedIds,
    lineupBaseForValidation,
    eligible,
    captainPlayerId,
    viceCaptainPlayerId,
  ]);

  const lineupReady = useMemo(() => {
    if (pendingOutSlot != null || plannedIds.length !== 5) return false;
    return validateFantasyTeamTransferLineup(
      plannedIds,
      lineupBaseForValidation,
      eligible,
    ).ok;
  }, [pendingOutSlot, plannedIds, lineupBaseForValidation, eligible]);

  const captaincyReady = useMemo(() => {
    if (!captainPlayerId || !viceCaptainPlayerId) return false;
    if (captainPlayerId === viceCaptainPlayerId) return false;
    return (
      plannedIds.includes(captainPlayerId) &&
      plannedIds.includes(viceCaptainPlayerId)
    );
  }, [captainPlayerId, viceCaptainPlayerId, plannedIds]);

  const canConfirm = useMemo(() => {
    if (readOnly || !pickForValidation || pendingOutSlot != null) return false;
    if (
      chipCode === "bench_boost" &&
      extraIds.length !== BENCH_BOOST_EXTRA_COUNT
    )
      return false;
    if (chipCode === "free_hit") {
      return validateInitialFantasyTeamBuild(pickForValidation, eligible).ok;
    }
    if (freeBuild) {
      return validateEmptyBaseTransferPick(pickForValidation, eligible).ok;
    }
    return validateFantasyTeamTransferPick(
      pickForValidation,
      permanentBasePlayerIds,
      eligible,
    ).ok;
  }, [
    readOnly,
    pickForValidation,
    pendingOutSlot,
    freeBuild,
    permanentBasePlayerIds,
    eligible,
    chipCode,
    extraIds,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leave the captaincy step when there is nothing to confirm
    if (!dirty) setCaptaincyStep(false);
  }, [dirty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leave the captaincy step when the lineup is incomplete
    if (!lineupReady) setCaptaincyStep(false);
  }, [lineupReady]);

  useEffect(() => {
    if (captaincyReady && captaincyStep) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leave the captaincy step once captaincy is set
      setCaptaincyStep(false);
    }
  }, [captaincyReady, captaincyStep]);

  const showCaptaincyNext =
    dirty && lineupReady && !captaincyReady && !captaincyStep;

  const selectedIds = useMemo(() => new Set(plannedIds), [plannedIds]);

  const changeLabel = freeBuild
    ? captaincyChanged
      ? "Captaincy updated"
      : "Confirm your squad"
    : summary.made > 0
      ? `${summary.made} transfer${summary.made === 1 ? "" : "s"}${captaincyChanged ? " + captaincy" : ""}`
      : captaincyChanged
        ? "Captaincy updated"
        : "Confirm your team";

  const handleSlotPress = useCallback(
    (index: number) => {
      if (readOnly) return;
      const playerId = slots[index];
      setActiveSlot(index);
      if (playerId) {
        setActionOpen(true);
        return;
      }
      if (freeBuild) {
        setPendingOutSlot(null);
        setPickerOpen(true);
      }
    },
    [readOnly, slots, freeBuild],
  );

  const assignPlayerToSlot = useCallback(
    (playerId: string) => {
      if (activeSlot == null) return;
      if (freeBuild) {
        setSlots((prev) => {
          const next = [...prev];
          const existingIndex = next.findIndex((id) => id === playerId);
          if (existingIndex >= 0) next[existingIndex] = null;
          next[activeSlot] = playerId;
          return next;
        });
        if (!captainPlayerId) {
          setCaptainPlayerId(playerId);
        } else if (!viceCaptainPlayerId && playerId !== captainPlayerId) {
          setViceCaptainPlayerId(playerId);
        }
        setPickerOpen(false);
        setPendingOutSlot(null);
        return;
      }
      setPendingOutSlot(null);
      setSlots((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex((id) => id === playerId);
        if (existingIndex >= 0) next[existingIndex] = null;
        next[activeSlot] = playerId;
        return next;
      });
    },
    [activeSlot, freeBuild, captainPlayerId, viceCaptainPlayerId],
  );

  function resetToSavedTeam() {
    setPendingOutSlot(null);
    setCaptaincyStep(false);
    if (savedTeam?.playerIds.length === 5) {
      setSlots(teamToSlots(savedTeam.playerIds));
      setCaptainPlayerId(savedTeam.captainPlayerId);
      setViceCaptainPlayerId(savedTeam.viceCaptainPlayerId);
      return;
    }
    if (freeBuild) {
      setSlots([...EMPTY_FIVE_SLOTS]);
      setCaptainPlayerId(null);
      setViceCaptainPlayerId(null);
      return;
    }
    setSlots(teamToSlots(permanentBasePlayerIds));
    setCaptainPlayerId(permanentBasePlayerIds[0] ?? null);
    setViceCaptainPlayerId(
      permanentBasePlayerIds.find((id) => id !== permanentBasePlayerIds[0]) ??
        null,
    );
  }

  async function submitCurrentPlan(acknowledgedPenalty: number) {
    if (!pickForValidation) return false;
    setConfirming(true);
    const result = await submitTeamAction(pick.matchday.id, {
      ...pickForValidation,
      expectedVersion: teamVersion,
      acknowledgedPenalty,
      chipCode,
      reservePlayerIds: chipCode === "bench_boost" ? extraIds : [],
    });
    setConfirming(false);
    if (result.ok === false) {
      if (result.code === "CONFLICT") {
        appToast.error(`${result.message} Reloading…`);
        router.refresh();
        return false;
      }
      appToast.error(result.message);
      return false;
    }
    const made = result.data.summary?.made ?? summary.made;
    const extra = result.data.summary?.extra ?? 0;
    appToast.success(
      chipCode
        ? `Team and ${chipCode.replace(/_/g, " ")} saved`
        : freeBuild
          ? "Squad saved"
          : extra > 0
            ? `Team confirmed — ${made} transfers (${extra} extra)`
            : made > 0
              ? `Team confirmed — ${made} transfer${made === 1 ? "" : "s"} (free)`
              : "Team confirmed",
    );
    clearLocalDraft(pick.matchday.id);
    setTeamVersion(result.data.version);
    setConfirmOpen(false);
    router.refresh();
    return true;
  }

  async function handleConfirm(acknowledgedPenalty: number) {
    if (!pickForValidation || !canConfirm) return;
    await submitCurrentPlan(acknowledgedPenalty);
  }

  async function handleCancelChip() {
    if (readOnly || !chipCode) return;
    setConfirming(true);
    const result = await submitTeamAction(pick.matchday.id, {
      ...(pickForValidation ?? {
        playerIds: plannedIds,
        captainPlayerId: captainPlayerId!,
        viceCaptainPlayerId: viceCaptainPlayerId!,
      }),
      expectedVersion: teamVersion,
      acknowledgedPenalty: 0,
      chipCode: null,
      reservePlayerIds: [],
    });
    setConfirming(false);
    if (result.ok === false) {
      appToast.error(result.message);
      return;
    }
    setChipCode(null);
    setReservePlayerIds([]);
    setTeamVersion(result.data.version);
    appToast.success("Chip cancelled");
    router.refresh();
  }

  /** Unsaved chip choice → just drop it locally; saved chip → persist the cancel. */
  function handleCancelChipFromDrawer() {
    if (chipCode && chipCode !== initial.chips?.activeChipCode) {
      setChipCode(null);
      setReservePlayerIds([]);
      return;
    }
    void handleCancelChip();
  }

  function handleContinueChipToTeam(code: ChipCode) {
    setChipCode(code);
    if (code === "free_hit") {
      setSlots(teamToSlots(permanentBasePlayerIds));
      setCaptainPlayerId(permanentBasePlayerIds[0] ?? null);
      setViceCaptainPlayerId(
        permanentBasePlayerIds.find((id) => id !== permanentBasePlayerIds[0]) ??
          null,
      );
    }
    if (code !== "bench_boost") setReservePlayerIds([]);
    setTab("team");
    // Bench Boost: go straight to choosing the extra players.
    if (code === "bench_boost") setExtrasOpen(true);
  }

  // Deep link from My team: /pick?chip=wildcard preselects that chip once.
  const deepLinkApplied = useRef(false);
  useEffect(() => {
    if (deepLinkApplied.current || readOnly) return;
    deepLinkApplied.current = true;
    const code = new URLSearchParams(window.location.search).get("chip");
    if (!code) return;
    const card = initial.chips?.chips.find((c) => c.code === code);
    if (card?.code === "bench_boost" && card.status.kind === "active") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL
      setExtrasOpen(true);
    } else if (card?.status.kind === "available") {
      handleContinueChipToTeam(card.code);
    }
    router.replace("/pick", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePlayerId = activeSlot != null ? slots[activeSlot] : null;
  const activePlayer = activePlayerId
    ? playerById.get(activePlayerId)
    : undefined;

  const playerNameById = useMemo(
    () => new Map(pick.players.map((p) => [p.id, p.displayName])),
    [pick.players],
  );

  const playerKitKeyById = useMemo(
    () => new Map(pick.players.map((p) => [p.id, p.kitKey])),
    [pick.players],
  );

  return (
    <div className="space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-10">
      <PageHeader
        eyebrow={`Gameweek ${pick.matchday.number}`}
        title={freeBuild ? "Build your squad" : "Transfers"}
        description={
          freeBuild
            ? "Pick your first five (free, unlimited transfers). Wildcard and Free Hit unlock after this gameweek."
            : undefined
        }
      />

      <div className="sticky top-0 z-20 space-y-3 rounded-2xl border border-border/50 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Deadline
          </p>
          <DeadlineCountdown
            deadlineAtIso={pick.matchday.deadlineAt}
            serverNowIso={pick.serverNow}
          />
        </div>
        {/* The first squad is free, so there is nothing to summarise. */}
        {freeBuild ? null : (
          <TransferSummaryStrip
            summary={summary}
            unlimitedLabel={
              chipCode === "wildcard"
                ? "Free (Wildcard)"
                : chipCode === "free_hit"
                  ? "Free (Free Hit)"
                  : null
            }
          />
        )}
      </div>

      {draftStaleNotice ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
          Your saved draft was cleared because the squad changed on the server.
        </p>
      ) : null}

      <div
        className="flex gap-2 rounded-xl bg-muted/40 p-1"
        role="tablist"
        aria-label="Transfers sections"
      >
        {(
          [
            ["team", "Team"],
            ["history", "History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              tab === key
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <TransferHistoryTab history={initial.history} />
      ) : (
        <>
          {readOnly ? <LockedBanner /> : null}

          {chipCode ? (
            <ActiveChipBanner
              chipCode={chipCode}
              readOnly={readOnly}
              cancelling={confirming}
              onCancel={handleCancelChip}
            />
          ) : null}

          {!readOnly && !dirty && savedTeam ? (
            <p
              className="animate-fade inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              role="status"
            >
              <Check className="size-3.5" aria-hidden />
              Team saved
            </p>
          ) : null}

          {captaincyStep && !readOnly ? (
            <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                Choose captain and vice-captain
              </p>
              <p className="text-xs text-muted-foreground">
                Tap each player below — required before you can confirm.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-0 text-muted-foreground"
                onClick={() => setCaptaincyStep(false)}
              >
                ← Back to transfers
              </Button>
            </div>
          ) : null}

          <div className="space-y-3">
            <TransferPitchSlots
              selection={slots}
              captainPlayerId={captainPlayerId}
              viceCaptainPlayerId={viceCaptainPlayerId}
              playerById={playerById}
              disabled={readOnly}
              pendingOutSlot={pendingOutSlot}
              incomingIds={incomingIds}
              showRoleBadges
              showIncomingBadges={
                !captaincyStep && chipCode !== "free_hit" && !freeBuild
              }
              captainMultiplier={chipCode === "triple_captain" ? 3 : undefined}
              pitchClassName={
                chipCode === "free_hit"
                  ? "border-violet-500/30 bg-gradient-to-b from-violet-500/15 via-card/80 to-card/40"
                  : undefined
              }
              onSlotPress={handleSlotPress}
              onUndoPending={(index) => {
                if (pendingOutSlot === index) setPendingOutSlot(null);
              }}
            />
            {chipCode === "bench_boost" ? (
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setExtrasOpen(true)}
                className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium">
                  Bench Boost · extra players score too
                </span>
                {extraIds.length > 0 ? (
                  <span className="flex items-center gap-4">
                    {extraIds.map((id) => (
                      <span
                        key={id}
                        className="flex flex-col items-center gap-1"
                      >
                        <PlayerShirt
                          name={playerNameById.get(id) ?? "?"}
                          kitKey={playerKitKeyById.get(id)}
                          size="md"
                        />
                        <span className="text-xs font-semibold">
                          {playerNameById.get(id) ?? "?"}
                        </span>
                      </span>
                    ))}
                  </span>
                ) : null}
                <span className="text-muted-foreground">
                  {extraIds.length < BENCH_BOOST_EXTRA_COUNT
                    ? `Tap to choose ${BENCH_BOOST_EXTRA_COUNT - extraIds.length} more extra player${BENCH_BOOST_EXTRA_COUNT - extraIds.length === 1 ? "" : "s"}`
                    : "Tap to change"}
                </span>
              </button>
            ) : null}
            {chipCode === "free_hit" ? (
              <details className="rounded-xl border border-border/50 bg-muted/20 px-4 py-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  Your permanent squad
                </summary>
                <p className="mt-2 text-muted-foreground">
                  {basePlayerIds
                    .map((id) => playerNameById.get(id) ?? "?")
                    .join(" · ")}
                </p>
              </details>
            ) : null}
            {!readOnly ? (
              <p className="text-center text-xs text-muted-foreground">
                {captaincyStep
                  ? "Tap a player to set captain or vice-captain."
                  : freeBuild
                    ? "Tap empty slots to add players, then set captain and vice-captain."
                    : "Tap a player to set captain, vice-captain or make a transfer."}
              </p>
            ) : null}
          </div>

          {!readOnly && dirty ? (
            <div className="glass animate-rise fixed inset-x-3 bottom-[calc(0.75rem+3.5rem+env(safe-area-inset-bottom))] z-30 rounded-t-2xl rounded-b-none border border-b-0 border-border/50 p-3 md:sticky md:inset-x-0 md:bottom-4 md:rounded-2xl md:border-b">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {changeLabel}
                  </p>
                  {summary.extra > 0 ? (
                    <p className="truncate text-xs font-medium text-amber-500">
                      {summary.extra} extra transfer
                      {summary.extra === 1 ? "" : "s"} ·{" "}
                      {summary.transferPenalty} pts
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetToSavedTeam}
                >
                  <RotateCcw aria-hidden />
                  Reset
                </Button>
                <Button
                  type="button"
                  size="lg"
                  disabled={
                    showCaptaincyNext ? false : !canConfirm || confirming
                  }
                  aria-busy={confirming}
                  onClick={() => {
                    if (showCaptaincyNext) {
                      setCaptaincyStep(true);
                      return;
                    }
                    // First gameweek free build: save immediately (no review sheet).
                    // Later weeks: open sheet if there are transfers or a points hit (in/out list + penalty ack).
                    const needsTransferReview =
                      !freeBuild && (summary.extra > 0 || summary.made > 0);
                    if (needsTransferReview) {
                      setConfirmOpen(true);
                      return;
                    }
                    void handleConfirm(0);
                  }}
                >
                  {showCaptaincyNext ? (
                    <>
                      Next
                      <ArrowRight aria-hidden />
                    </>
                  ) : !freeBuild && (summary.extra > 0 || summary.made > 0) ? (
                    <>
                      Review
                      <ArrowRight aria-hidden />
                    </>
                  ) : (
                    <>
                      Save
                      <Check aria-hidden />
                    </>
                  )}
                </Button>
              </div>
              {blockedMessage ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {blockedMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPendingOutSlot(null);
        }}
        players={pick.players}
        selectedIds={selectedIds}
        onSelect={assignPlayerToSlot}
        replacingName={
          pendingOutSlot != null && slots[pendingOutSlot]
            ? (playerById.get(slots[pendingOutSlot]!)?.displayName ?? null)
            : null
        }
        replacingKitKey={
          pendingOutSlot != null && slots[pendingOutSlot]
            ? (playerById.get(slots[pendingOutSlot]!)?.kitKey ?? null)
            : null
        }
        costBanner={
          unlimitedTransfers || freeBuild
            ? null
            : pickerWouldBeExtra
              ? `This transfer costs −${initial.penaltyPerExtra}`
              : null
        }
      />

      <ExtraPlayersSheet
        open={extrasOpen}
        onClose={() => setExtrasOpen(false)}
        players={pick.players.filter((p) => !plannedIds.includes(p.id))}
        selectedIds={extraIds}
        onChange={setReservePlayerIds}
        onRemoveChip={readOnly ? undefined : handleCancelChipFromDrawer}
      />

      {activePlayer ? (
        <SlotActionSheet
          open={actionOpen}
          onClose={() => setActionOpen(false)}
          playerName={activePlayer.displayName}
          playerKitKey={activePlayer.kitKey}
          isCaptain={activePlayerId === captainPlayerId}
          isVice={activePlayerId === viceCaptainPlayerId}
          transferMode
          showCaptainActions
          showSquadEditActions={!captaincyStep}
          onMakeCaptain={() => {
            if (activePlayerId) {
              setCaptainPlayerId(activePlayerId);
              if (viceCaptainPlayerId === activePlayerId) {
                setViceCaptainPlayerId(null);
              }
            }
          }}
          onMakeVice={() => {
            if (activePlayerId) {
              setViceCaptainPlayerId(activePlayerId);
              if (captainPlayerId === activePlayerId) {
                setCaptainPlayerId(null);
              }
            }
          }}
          onReplace={() => {
            setActionOpen(false);
            if (freeBuild) {
              setPickerOpen(true);
              return;
            }
            if (activeSlot != null) setPendingOutSlot(activeSlot);
            setPickerOpen(true);
          }}
          onRemove={
            freeBuild && activeSlot != null
              ? () => {
                  const removed = slots[activeSlot];
                  setSlots((prev) => {
                    const next = [...prev];
                    next[activeSlot] = null;
                    return next;
                  });
                  if (removed === captainPlayerId) setCaptainPlayerId(null);
                  if (removed === viceCaptainPlayerId) {
                    setViceCaptainPlayerId(null);
                  }
                }
              : undefined
          }
        />
      ) : null}

      <TransferConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        confirming={confirming}
        basePlayerIds={lineupBaseForValidation}
        plannedPlayerIds={plannedIds}
        summary={summary}
        playerNameById={playerNameById}
        playerKitKeyById={playerKitKeyById}
      />
    </div>
  );
}

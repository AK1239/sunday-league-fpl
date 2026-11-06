import { connection } from "next/server";
import Link from "next/link";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PickTeamClient } from "@/components/pick/pick-team-client";
import { TransfersTeamClient } from "@/components/pick/transfers-team-client";
import { serializeTransferPageData } from "@/components/pick/transfer-types";
import { TeamNamePrompt } from "@/components/manager/team-name-dialog";
import { requireUser } from "@/server/auth/require-user";
import { getTeamName } from "@/server/domain/team-name";
import { getDb } from "@/server/db";
import { getTransferPageData } from "@/server/queries/transfer-page-data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function PickTeamPanel() {
  await connection();
  const user = await requireUser();
  const page = await getTransferPageData(getDb(), user.userId);
  const serialized = page ? serializeTransferPageData(page) : null;

  // First team saved but still no team name: prompt for one (skippable).
  const hasSavedTeam =
    serialized?.pick.myTeam?.playerIds.length === 5 &&
    serialized.pick.myTeamSource !== "carry_over";
  const needsTeamName =
    hasSavedTeam && (await getTeamName(getDb(), user.userId)) == null;

  if (!serialized) {
    return (
      <EmptyState
        title="No gameweek open for picks"
        description="When the admin schedules the next Sunday gameweek, you can pick your five here."
        action={
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Back to home
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {needsTeamName ? <TeamNamePrompt userId={user.userId} /> : null}
      {serialized.mode === "transfers" ? (
        <TransfersTeamClient
          key={`${serialized.pick.matchday.id}-${serialized.teamVersion}`}
          initial={serialized}
        />
      ) : (
        <PickTeamClient
          initial={serialized.pick}
          standardReason={serialized.standardReason}
        />
      )}
    </div>
  );
}

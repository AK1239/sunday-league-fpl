import { connection } from "next/server";
import Link from "next/link";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PickTeamClient } from "@/components/pick/pick-team-client";
import { TransfersTeamClient } from "@/components/pick/transfers-team-client";
import { serializeTransferPageData } from "@/components/pick/transfer-types";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { getTransferPageData } from "@/server/queries/transfer-page-data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function PickTeamPanel() {
  await connection();
  const user = await requireUser();
  const page = await getTransferPageData(getDb(), user.userId);
  const serialized = page ? serializeTransferPageData(page) : null;

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
      {serialized.mode === "transfers" ? (
        <TransfersTeamClient initial={serialized} />
      ) : (
        <PickTeamClient initial={serialized.pick} />
      )}
    </div>
  );
}

import { connection } from "next/server";
import Link from "next/link";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PickTeamClient } from "@/components/pick/pick-team-client";
import { serializePickTeamData } from "@/components/pick/pick-team-types";
import { requireUser } from "@/server/auth/require-user";
import { getDb } from "@/server/db";
import { getPickTeamData } from "@/server/queries/pick-team-data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function PickTeamPanel() {
  await connection();
  const user = await requireUser();
  const data = await getPickTeamData(getDb(), user.userId);

  if (!data) {
    return (
      <EmptyState
        title="No gameweek open for picks"
        description="When the admin schedules the next Sunday gameweek, you can pick your five here."
        action={
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to home
          </Link>
        }
      />
    );
  }

  return <PickTeamClient initial={serializePickTeamData(data)} />;
}

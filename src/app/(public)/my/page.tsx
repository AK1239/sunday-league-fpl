import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/fantasy/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { MyProtectedGate } from "@/components/manager/my-protected-gate";
import { requireUser } from "@/server/auth/require-user";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function MyHomeContent() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Welcome, ${user.displayName}`}
        title="My Team"
        description="Your squad and gameweek points live here."
      />
      <div className="surface flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Build or update your five-a-side lineup before each Sunday deadline.
        </p>
        <Link
          href="/pick"
          className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
        >
          Pick Team
        </Link>
      </div>
    </div>
  );
}

async function MyPageShell() {
  return (
    <MyProtectedGate>
      <MyHomeContent />
    </MyProtectedGate>
  );
}

export default function MyTeamPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8" role="status">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-12 w-2/3 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <MyPageShell />
    </Suspense>
  );
}

import { Shirt } from "lucide-react";
import { Suspense } from "react";
import { EmptyState } from "@/components/fantasy/empty-state";
import { PageHeader } from "@/components/fantasy/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { MyProtectedGate } from "@/components/manager/my-protected-gate";
import { requireUser } from "@/server/auth/require-user";

async function MyHomeContent() {
  const user = await requireUser();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Welcome, ${user.displayName}`}
        title="My Team"
        description="Your squad and matchday points live here."
      />
      <EmptyState
        icon={<Shirt />}
        title="Team selection is coming"
        description="Team selection and gameweek points arrive in the next phase — for now this confirms your manager account works."
      />
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

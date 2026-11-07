import { Suspense } from "react";
import { ManagerProfilePanel } from "@/components/public/manager-profile-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerGameweekProfilePage({
  params,
}: {
  params: Promise<{ managerId: string; matchdayId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-12 w-2/3 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      }
    >
      <ManagerProfileGameweekPanel params={params} />
    </Suspense>
  );
}

async function ManagerProfileGameweekPanel({
  params,
}: {
  params: Promise<{ managerId: string; matchdayId: string }>;
}) {
  const { managerId, matchdayId } = await params;
  return (
    <ManagerProfilePanel managerId={managerId} matchdayId={matchdayId} />
  );
}

import { Suspense } from "react";
import { ManagerProfilePanel } from "@/components/public/manager-profile-panel";
import { Skeleton } from "@/components/ui/skeleton";

export default function ManagerProfilePage({
  params,
}: {
  params: Promise<{ managerId: string }>;
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
      <ManagerProfilePanelWrapper params={params} />
    </Suspense>
  );
}

async function ManagerProfilePanelWrapper({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const { managerId } = await params;
  return <ManagerProfilePanel managerId={managerId} />;
}

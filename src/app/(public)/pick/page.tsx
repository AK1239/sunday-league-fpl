import { Suspense } from "react";
import { MyAuthLoading } from "@/components/manager/my-auth-loading";
import { PickTeamSkeleton } from "@/components/pick/pick-team-skeleton";
import { PickTeamPanel } from "@/components/pick/pick-team-panel";
import { MyProtectedGate } from "@/components/manager/my-protected-gate";

export default function PickTeamPage() {
  return (
    <Suspense fallback={<MyAuthLoading />}>
      <MyProtectedGate>
        <Suspense fallback={<PickTeamSkeleton />}>
          <PickTeamPanel />
        </Suspense>
      </MyProtectedGate>
    </Suspense>
  );
}

import { Suspense } from "react";
import { MyAuthLoading } from "@/components/manager/my-auth-loading";
import { ManagerSubnav } from "@/components/manager/manager-subnav";
import { MyProtectedGate } from "@/components/manager/my-protected-gate";
import { Skeleton } from "@/components/ui/skeleton";

export function MyPagesShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<MyAuthLoading />}>
      <MyProtectedGate>
        <div className="mx-auto max-w-3xl space-y-6">
          <ManagerSubnav />
          <Suspense
            fallback={
              <div className="space-y-4" role="status">
                <Skeleton className="h-10 w-2/3 rounded-xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </MyProtectedGate>
    </Suspense>
  );
}

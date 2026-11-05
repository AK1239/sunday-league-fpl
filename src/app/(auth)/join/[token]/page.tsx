import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/auth-loading";
import { JoinPageContent } from "@/components/manager/join-page-content";

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<AuthLoading label="Loading invite…" />}>
      <JoinPageContent params={params} />
    </Suspense>
  );
}

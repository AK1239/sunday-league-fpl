import { Suspense } from "react";
import { JoinPageContent } from "@/components/manager/join-page-content";

export default function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <p className="py-10 text-center text-sm text-muted-foreground" role="status">
          Loading invite…
        </p>
      }
    >
      <JoinPageContent params={params} />
    </Suspense>
  );
}

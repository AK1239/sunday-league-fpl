import { Suspense } from "react";
import { MyProtectedGate } from "@/components/manager/my-protected-gate";
import { requireUser } from "@/server/auth/require-user";

async function MyHomeContent() {
  const user = await requireUser();

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        My Team
      </h1>
      <p className="text-sm text-muted-foreground">
        Welcome, {user.displayName}. Team selection and gameweek points arrive
        in the next phase — for now this confirms your manager account works.
      </p>
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
        <p className="py-10 text-center text-sm text-muted-foreground" role="status">
          Loading…
        </p>
      }
    >
      <MyPageShell />
    </Suspense>
  );
}

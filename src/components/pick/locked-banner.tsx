import { Lock } from "lucide-react";

export function LockedBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3"
      role="status"
    >
      <Lock
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="space-y-1 text-sm">
        <p className="font-medium">Team locked</p>
        <p className="text-muted-foreground">
          The deadline has passed. Your effective team is shown below.
        </p>
      </div>
    </div>
  );
}

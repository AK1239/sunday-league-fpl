import { Loader2 } from "lucide-react";

export function AuthLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
      {label}
    </div>
  );
}

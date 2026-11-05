import { AlertCircle } from "lucide-react";

/** Keyed on the message so it re-shakes on every new failed attempt. */
export function FormError({ message }: { message: string }) {
  return (
    <div
      key={message}
      role="alert"
      className="animate-shake flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

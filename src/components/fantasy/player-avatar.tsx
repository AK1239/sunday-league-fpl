import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlayerAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- mock avatars only in Phase 1
      <img
        src={avatarUrl}
        alt=""
        className={cn(
          "rounded-full object-cover ring-2 ring-border/60",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-2 ring-primary/30",
        sizeClasses[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

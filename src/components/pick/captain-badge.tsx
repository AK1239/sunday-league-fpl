import { cn } from "@/lib/utils";

export function CaptainBadge({
  role,
  className,
  captainMultiplier,
}: {
  role: "captain" | "vice_captain";
  className?: string;
  /** When Triple Captain is active, show ×3 on the captain badge. */
  captainMultiplier?: 2 | 3;
}) {
  const label = role === "captain" ? "Captain" : "Vice";
  const showTriple = role === "captain" && captainMultiplier === 3;
  return (
    <span
      className={cn(
        "inline-flex min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 ring-background",
        showTriple ? "h-6 bg-podium-gold text-foreground" : "size-6",
        !showTriple &&
          (role === "captain"
            ? "bg-primary text-primary-foreground"
            : "bg-team-b text-foreground"),
        className,
      )}
      title={showTriple ? "Triple Captain ×3" : label}
      aria-label={showTriple ? "Triple Captain times three" : label}
    >
      {showTriple ? "×3" : role === "captain" ? "C" : "V"}
    </span>
  );
}

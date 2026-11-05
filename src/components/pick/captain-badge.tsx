import { cn } from "@/lib/utils";

export function CaptainBadge({
  role,
  className,
}: {
  role: "captain" | "vice_captain";
  className?: string;
}) {
  const label = role === "captain" ? "Captain" : "Vice";
  const letter = role === "captain" ? "C" : "V";
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-background",
        role === "captain"
          ? "bg-primary text-primary-foreground"
          : "bg-team-b text-foreground",
        className,
      )}
      title={label}
      aria-label={label}
    >
      {letter}
    </span>
  );
}

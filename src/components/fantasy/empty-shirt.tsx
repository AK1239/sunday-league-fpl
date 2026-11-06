import { cn } from "@/lib/utils";

// Same silhouette as PlayerShirt (100×100 viewBox) so empty slots match filled ones.
const SHIRT =
  "M34 8 L14 18 L3 40 L20 48 L25 40 L25 92 Q25 95 28 95 L72 95 Q75 95 75 92 L75 40 L80 48 L97 40 L86 18 L66 8 Q50 22 34 8 Z";

const sizeClasses = {
  sm: "w-9",
  md: "w-12",
  lg: "w-16",
  xl: "w-24",
} as const;

/** A dashed "ghost" shirt with a plus: the placeholder for an unfilled slot. */
export function EmptyShirt({
  size = "lg",
  className,
}: {
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={cn(
        "shrink-0 text-primary transition-transform group-hover/slot:scale-105",
        sizeClasses[size],
        className,
      )}
    >
      <path
        d={SHIRT}
        fill="currentColor"
        fillOpacity="0.07"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeDasharray="5 4"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="58" r="13" fill="currentColor" fillOpacity="0.18" />
      <path
        d="M50 51 V65 M43 58 H57"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

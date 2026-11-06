import { useId } from "react";
import type { Kit } from "@/lib/kits";
import { kitForPlayer, kitForPlayerRow } from "@/lib/kits";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "w-9",
  md: "w-12",
  lg: "w-16",
  xl: "w-24",
} as const;

// Short-sleeve shirt silhouette on a 100×100 viewBox.
const SHIRT =
  "M34 8 L14 18 L3 40 L20 48 L25 40 L25 92 Q25 95 28 95 L72 95 Q75 95 75 92 L75 40 L80 48 L97 40 L86 18 L66 8 Q50 22 34 8 Z";
const SLEEVE_L = "M14 18 L3 40 L20 48 L25 40 L25 22 Z";
const SLEEVE_R = "M86 18 L97 40 L80 48 L75 40 L75 22 Z";
const COLLAR = "M34 8 Q50 22 66 8 L62 6 Q50 16 38 6 Z";

export function PlayerShirt({
  name,
  kitKey,
  kit: kitOverride,
  size = "md",
  className,
}: {
  name: string;
  /** When set (from DB), drives shirt colours. Omit to use legacy name-based map. */
  kitKey?: string | null;
  /** Optional pre-resolved kit (avoids recomputing when parent already has row data). */
  kit?: Kit;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const kit =
    kitOverride ??
    (kitKey != null ? kitForPlayerRow(name, kitKey) : kitForPlayer(name));
  const uid = useId().replace(/:/g, "");
  const clip = `shirt-${uid}`;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${name} — ${kit.label} shirt`}
      className={cn(
        "shrink-0 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]",
        sizeClasses[size],
        className,
      )}
    >
      <defs>
        <clipPath id={clip}>
          <path d={SHIRT} />
        </clipPath>
        <linearGradient id={`${clip}-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={kit.body} />
        {kit.pattern === "stripes"
          ? [25, 35, 45, 55, 65, 75].map((x, i) =>
              i % 2 === 0 ? (
                <rect
                  key={x}
                  x={x}
                  y="0"
                  width="10"
                  height="100"
                  fill={kit.accent}
                />
              ) : null,
            )
          : null}
        {kit.pattern === "band" ? (
          <>
            <rect x="43" y="0" width="14" height="100" fill={kit.accent} />
            <rect
              x="41"
              y="0"
              width="2"
              height="100"
              fill="#fff"
              opacity="0.9"
            />
            <rect
              x="57"
              y="0"
              width="2"
              height="100"
              fill="#fff"
              opacity="0.9"
            />
          </>
        ) : null}
        {kit.pattern !== "stripes" ? (
          <>
            <path d={SLEEVE_L} fill={kit.accent} opacity="0.35" />
            <path d={SLEEVE_R} fill={kit.accent} opacity="0.35" />
          </>
        ) : (
          <>
            <path d={SLEEVE_L} fill={kit.body} />
            <path d={SLEEVE_R} fill={kit.body} />
          </>
        )}
        <rect width="100" height="100" fill={`url(#${clip}-shade)`} />
      </g>

      <path d={COLLAR} fill={kit.trim} />
      <path
        d={SHIRT}
        fill="none"
        stroke="#000"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {kit.mark ? (
        <text
          x="50"
          y="46"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          letterSpacing="1"
          fill={kit.trim}
        >
          {kit.mark}
        </text>
      ) : null}
    </svg>
  );
}

/** Dashed placeholder shirt for empty lineup slots. */
export function GhostShirt({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      style={style}
      className={cn("w-12", className)}
    >
      <path
        d={SHIRT}
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeDasharray="5 4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

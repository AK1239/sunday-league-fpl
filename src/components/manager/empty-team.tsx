import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GhostShirt } from "@/components/fantasy/player-shirt";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROWS = [2, 1, 2] as const;

export function EmptyTeam({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  let slot = 0;
  return (
    <div className="animate-rise relative overflow-hidden rounded-3xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
      <div
        aria-hidden
        className="absolute top-0 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div
        aria-hidden
        className="relative mx-auto mb-7 flex w-fit flex-col items-center gap-3 text-muted-foreground"
      >
        {ROWS.map((count, r) => (
          <div key={r} className="flex gap-6">
            {Array.from({ length: count }).map(() => {
              const i = slot++;
              return (
                <GhostShirt
                  key={i}
                  className="animate-pop w-11 sm:w-12"
                  style={{ "--d": `${i * 90}ms` } as React.CSSProperties}
                />
              );
            })}
          </div>
        ))}
      </div>

      <h3 className="font-heading relative text-2xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="relative mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action ? (
        <Link
          href={action.href}
          className={cn(
            buttonVariants({ size: "lg" }),
            "group/cta relative mt-6",
          )}
        >
          {action.label}
          <ArrowRight
            className="transition-transform group-hover/cta:translate-x-0.5"
            aria-hidden
          />
        </Link>
      ) : null}
    </div>
  );
}

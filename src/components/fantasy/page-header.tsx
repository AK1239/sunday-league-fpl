import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("animate-rise space-y-2", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="max-w-prose text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

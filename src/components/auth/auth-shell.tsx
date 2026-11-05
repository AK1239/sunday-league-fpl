import Link from "next/link";
import { Trophy } from "lucide-react";
import { LEAGUE_NAME, LEAGUE_SHORT } from "@/lib/league";

/**
 * Full-bleed, split-screen shell for sign-in / join / admin login.
 * Left: brand panel (hidden on mobile). Right: the form card.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative isolate grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden border-r border-border/50 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="animate-float absolute -left-24 top-1/4 size-[34rem] rounded-full bg-primary/20 blur-[110px]"
        />
        <div
          aria-hidden
          className="animate-float absolute -bottom-32 right-0 size-[26rem] rounded-full bg-team-b/15 blur-[110px] [animation-delay:-6s]"
        />
        <div aria-hidden className="grid-fade absolute inset-0" />

        <Link
          href="/"
          className="relative z-10 inline-flex w-fit items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="glow-primary flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            {LEAGUE_SHORT}
          </span>
          <span className="font-heading text-lg font-semibold tracking-wide">
            {LEAGUE_NAME}
          </span>
        </Link>

        <div className="relative z-10 max-w-md space-y-6">
          <div
            className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            style={{ "--d": "100ms" } as React.CSSProperties}
          >
            <Trophy className="size-3.5" aria-hidden />
            Sunday 5-a-side · Fantasy
          </div>
          <h2
            className="animate-rise font-heading text-5xl leading-[1.02] font-bold tracking-tight xl:text-6xl"
            style={{ "--d": "200ms" } as React.CSSProperties}
          >
            Pick your squad.
            <br />
            <span className="text-gradient">Own the table.</span>
          </h2>
          <p
            className="animate-rise max-w-sm text-muted-foreground"
            style={{ "--d": "320ms" } as React.CSSProperties}
          >
            Goals, assists and bragging rights — every Sunday counts toward your
            fantasy points.
          </p>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {LEAGUE_NAME}
        </p>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent lg:hidden"
        />
        <div className="relative w-full max-w-sm space-y-8">
          <Link
            href="/"
            className="animate-fade mx-auto flex w-fit items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <span className="glow-primary flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
              {LEAGUE_SHORT}
            </span>
            <span className="font-heading font-semibold tracking-wide">
              {LEAGUE_NAME}
            </span>
          </Link>

          <header
            className="animate-rise space-y-2 text-center lg:text-left"
            style={{ "--d": "60ms" } as React.CSSProperties}
          >
            {eyebrow ? (
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </header>

          <div
            className="animate-rise glass rounded-3xl p-6 sm:p-7"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            {children}
          </div>

          {footer ? (
            <div
              className="animate-fade space-y-3 text-center text-sm text-muted-foreground lg:text-left"
              style={{ "--d": "320ms" } as React.CSSProperties}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

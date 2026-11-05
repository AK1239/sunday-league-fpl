import { BottomNav } from "./bottom-nav";
import { SiteHeader } from "./site-header";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:pb-10"
      >
        {children}
      </main>
      <BottomNav />
    </>
  );
}

"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BottomNav } from "./bottom-nav";
import { SiteHeader } from "./site-header";

function isManagerAppRoute(pathname: string): boolean {
  return (
    pathname === "/my" ||
    pathname.startsWith("/my/") ||
    pathname === "/pick" ||
    pathname.startsWith("/pick/")
  );
}

export function PublicShellChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const managerApp = isManagerAppRoute(pathname);

  if (managerApp) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-border/40" />}>
        <SiteHeader />
      </Suspense>
      <main
        id="main-content"
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-28 md:pb-14"
      >
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}

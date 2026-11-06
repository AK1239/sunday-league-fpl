"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="bottom-center"
      offset={88}
      mobileOffset={{ bottom: 100 }}
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group !rounded-2xl !border !border-border/60 !bg-card/95 !text-foreground !shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md",
          title: "!text-sm !font-semibold",
          description: "!text-xs !text-muted-foreground",
          success: "!border-primary/35",
          error: "!border-destructive/45",
          closeButton:
            "!border-border/50 !bg-muted/40 !text-muted-foreground hover:!text-foreground",
        },
      }}
    />
  );
}

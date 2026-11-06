"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { appToast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";

export function InviteJoinLink({ joinPath }: { joinPath: string }) {
  const [copied, setCopied] = useState(false);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return joinPath;
    return new URL(joinPath, window.location.origin).href;
  }, [joinPath]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      appToast.success("Invite link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      appToast.error("Could not copy — select the link and copy manually.");
    }
  }

  return (
    <div
      className="animate-pop rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm"
      role="status"
    >
      <p className="font-medium">Share this full link</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Send the whole URL (WhatsApp, iMessage, etc.).
      </p>
      <p className="mt-3 break-all rounded-lg bg-background/50 px-3 py-2 font-mono text-xs">
        {joinUrl}
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        variant="secondary"
        onClick={copyLink}
      >
        {copied ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}

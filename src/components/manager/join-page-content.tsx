import Link from "next/link";
import { notFound } from "next/navigation";
import { JoinForm } from "@/components/manager/join-form";
import { getInvitePreviewByToken } from "@/server/domain/invites";

export async function JoinPageContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getInvitePreviewByToken(token);
  if (!preview) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <header className="space-y-1 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          {preview.isPasswordReset
            ? "Reset your password"
            : "Join the league"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {preview.isPasswordReset
            ? "Choose a new password for your manager account."
            : "Create your manager account for Mkate Champions League."}
        </p>
      </header>
      <JoinForm token={token} preview={preview} />
      <p className="text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Already have an account? Sign in
        </Link>
      </p>
    </div>
  );
}

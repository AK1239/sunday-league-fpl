import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { JoinForm } from "@/components/manager/join-form";
import { LEAGUE_NAME } from "@/lib/league";
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
    <AuthShell
      eyebrow={preview.isPasswordReset ? "Account recovery" : "You're invited"}
      title={preview.isPasswordReset ? "Reset password" : "Join the league"}
      subtitle={
        preview.isPasswordReset
          ? "Choose a new password for your manager account."
          : `Create your manager account for ${LEAGUE_NAME}.`
      }
      footer={
        <Link
          href="/login"
          className="inline-block font-medium text-primary transition-colors hover:underline"
        >
          Already have an account? Sign in
        </Link>
      }
    >
      <JoinForm token={token} preview={preview} />
    </AuthShell>
  );
}

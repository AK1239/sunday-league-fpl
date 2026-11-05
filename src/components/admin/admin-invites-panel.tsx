import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { CreateInviteForm } from "@/components/admin/create-invite-form";
import { listManagerInvites } from "@/server/actions/invites";
import { requireAdmin } from "@/server/auth/require-admin";
import { getDb } from "@/server/db";
import { players, users } from "@/server/db/schema";

export async function AdminInvitesPanel() {
  await connection();
  await requireAdmin();

  const [invites, playerRows, managerRows] = await Promise.all([
    listManagerInvites(),
    getDb()
      .select({ id: players.id, displayName: players.displayName })
      .from(players)
      .orderBy(players.displayName),
    getDb()
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.role, "manager"))
      .orderBy(users.displayName),
  ]);

  return (
    <div className="space-y-8">
      <CreateInviteForm players={playerRows} managers={managerRows} />

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Recent invites</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invites yet.</p>
        ) : (
          <ul className="surface divide-y divide-border/40 overflow-hidden rounded-2xl">
            {invites.map((invite) => {
              const status = invite.usedAt
                ? "Used"
                : invite.expiresAt < new Date()
                  ? "Expired"
                  : "Open";
              return (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {invite.isPasswordReset
                        ? `Password reset — ${invite.resetUserEmail ?? "user"}`
                        : invite.label || "Manager invite"}
                    </p>
                    <p className="text-muted-foreground">
                      {invite.linkedPlayerName
                        ? `Linked: ${invite.linkedPlayerName}`
                        : "No footballer link"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p
                      className={
                        "inline-block rounded-full px-2 py-0.5 font-medium " +
                        (status === "Open"
                          ? "bg-primary/15 text-primary"
                          : status === "Used"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/15 text-destructive")
                      }
                    >
                      {status}
                    </p>
                    <p>Expires {invite.expiresAt.toLocaleDateString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

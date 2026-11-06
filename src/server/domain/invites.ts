import { and, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { managerInvites, users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import {
  createSessionToken,
  hashSessionToken,
} from "@/server/auth/session-token";

export type InvitePreview = {
  inviteId: string;
  label: string | null;
  isPasswordReset: boolean;
  resetEmail: string | null;
  /** Same link can onboard multiple managers until expiry. */
  isReusable: boolean;
};

export type CreateInviteInput = {
  label?: string;
  linkedPlayerId?: string | null;
  expiresInDays?: number;
  resetUserId?: string | null;
  /** Ignored when `resetUserId` is set (password reset stays single-use). */
  reusable?: boolean;
  createdByUserId: string;
};

export type CreateInviteResult = {
  inviteId: string;
  token: string;
  expiresAt: Date;
};

export type AcceptInviteInput = {
  token: string;
  email: string;
  displayName: string;
  password: string;
};

export type AcceptInviteResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      code:
        | "INVALID_TOKEN"
        | "EXPIRED"
        | "ALREADY_USED"
        | "EMAIL_TAKEN"
        | "VALIDATION";
      message: string;
    };

const DEFAULT_INVITE_DAYS = 14;

export async function createManagerInvite(
  input: CreateInviteInput,
): Promise<CreateInviteResult> {
  const isReset = Boolean(input.resetUserId);
  const reusable = !isReset && Boolean(input.reusable);
  if (reusable && input.linkedPlayerId) {
    throw new Error(
      "Reusable invites cannot link to a footballer (each manager needs their own link for that).",
    );
  }

  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const days = input.expiresInDays ?? DEFAULT_INVITE_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const [row] = await getDb()
    .insert(managerInvites)
    .values({
      tokenHash,
      label: input.label?.trim() || null,
      linkedPlayerId: input.linkedPlayerId ?? null,
      createdByUserId: input.createdByUserId,
      expiresAt,
      resetUserId: input.resetUserId ?? null,
      reusable,
    })
    .returning({ id: managerInvites.id });

  return { inviteId: row.id, token, expiresAt };
}

export async function getInvitePreviewByToken(
  rawToken: string,
): Promise<InvitePreview | null> {
  const tokenHash = hashSessionToken(rawToken);
  const now = new Date();

  const rows = await getDb()
    .select({
      inviteId: managerInvites.id,
      label: managerInvites.label,
      expiresAt: managerInvites.expiresAt,
      usedAt: managerInvites.usedAt,
      resetUserId: managerInvites.resetUserId,
      resetEmail: users.email,
      reusable: managerInvites.reusable,
    })
    .from(managerInvites)
    .leftJoin(users, eq(managerInvites.resetUserId, users.id))
    .where(eq(managerInvites.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt <= now) return null;

  const isPasswordReset = Boolean(row.resetUserId);
  if (isPasswordReset && row.usedAt) return null;
  if (!isPasswordReset && !row.reusable && row.usedAt) return null;

  return {
    inviteId: row.inviteId,
    label: row.label,
    isPasswordReset,
    resetEmail: row.resetEmail,
    isReusable: Boolean(row.reusable),
  };
}

export async function acceptManagerInvite(
  input: AcceptInviteInput,
): Promise<AcceptInviteResult> {
  const token = input.token.trim();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const password = input.password;

  if (password.length < 8) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Password must be at least 8 characters.",
    };
  }

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  return getDb().transaction(async (tx) => {
    const inviteRows = await tx
      .select()
      .from(managerInvites)
      .where(
        and(
          eq(managerInvites.tokenHash, tokenHash),
          gt(managerInvites.expiresAt, now),
          or(
            and(
              isNotNull(managerInvites.resetUserId),
              isNull(managerInvites.usedAt),
            ),
            and(
              isNull(managerInvites.resetUserId),
              or(
                eq(managerInvites.reusable, true),
                isNull(managerInvites.usedAt),
              ),
            ),
          ),
        ),
      )
      .limit(1)
      .for("update");

    const invite = inviteRows[0];
    if (!invite) {
      return {
        ok: false,
        code: "INVALID_TOKEN",
        message: "This invite link is invalid or has expired.",
      } as AcceptInviteResult;
    }

    if (invite.resetUserId) {
      if (email) {
        const account = await tx
          .select({ id: users.id, email: users.email })
          .from(users)
          .where(eq(users.id, invite.resetUserId))
          .limit(1);
        const expected = account[0]?.email.toLowerCase();
        if (expected && email !== expected) {
          return {
            ok: false,
            code: "VALIDATION",
            message: "Email does not match this reset link.",
          } as AcceptInviteResult;
        }
      }

      const passwordHash = await hashPassword(password);
      await tx
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, invite.resetUserId));

      await tx
        .update(managerInvites)
        .set({ usedAt: now, usedByUserId: invite.resetUserId })
        .where(eq(managerInvites.id, invite.id));

      return { ok: true, userId: invite.resetUserId } as AcceptInviteResult;
    }

    if (!email || !displayName) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Email and display name are required.",
      } as AcceptInviteResult;
    }

    const existing = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing[0]) {
      return {
        ok: false,
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
      } as AcceptInviteResult;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await tx
      .insert(users)
      .values({
        email,
        displayName,
        passwordHash,
        role: "manager",
        linkedPlayerId: invite.linkedPlayerId,
        status: "active",
      })
      .returning({ id: users.id });

    if (!invite.reusable) {
      await tx
        .update(managerInvites)
        .set({ usedAt: now, usedByUserId: user.id })
        .where(eq(managerInvites.id, invite.id));
    }

    return { ok: true, userId: user.id } as AcceptInviteResult;
  });
}

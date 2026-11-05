"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginWithCredentials } from "@/server/auth/login";
import { createUserSession, destroyUserSession } from "@/server/auth/session";
import { acceptInviteAction } from "./invites";
import { actionFail, type ActionResult } from "./action-result";

function clientKeyFromHeaders(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local"
  );
}

export async function managerLoginAction(
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return actionFail("VALIDATION", "Email and password are required.", {
      email: !email ? "Required" : "",
      password: !password ? "Required" : "",
    });
  }

  const headerStore = await headers();
  const result = await loginWithCredentials(
    email,
    password,
    clientKeyFromHeaders(headerStore),
    { allowedRoles: ["manager", "admin"] },
  );

  if (!result.ok) {
    if (result.code === "RATE_LIMITED") {
      return actionFail(
        "RATE_LIMITED",
        "Too many login attempts. Try again later.",
      );
    }
    return actionFail("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  redirect("/my");
}

export async function managerLogoutAction(): Promise<void> {
  await destroyUserSession();
  redirect("/login");
}

export async function completeJoinAndSignInAction(
  formData: FormData,
): Promise<ActionResult> {
  const accepted = await acceptInviteAction(formData);
  if (accepted.ok === false) {
    return accepted;
  }

  await createUserSession(accepted.data.userId);
  redirect("/my");
}

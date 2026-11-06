"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionFail, type ActionResult } from "./action-result";
import { loginWithCredentials } from "@/server/auth/login";
import { destroyAdminSession } from "@/server/auth/session";

function clientKeyFromHeaders(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local"
  );
}

function clientAuditFromHeaders(headerStore: Headers): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      null,
    userAgent: headerStore.get("user-agent") || null,
  };
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return actionFail("VALIDATION", "Email and password are required.", {
      email: !email ? "Required" : "",
      password: !password ? "Required" : "",
    });
  }

  const headerStore = await headers();
  const audit = clientAuditFromHeaders(headerStore);
  const result = await loginWithCredentials(
    email,
    password,
    clientKeyFromHeaders(headerStore),
    {
      allowedRoles: ["admin"],
      audit: { ...audit, surface: "admin" },
    },
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

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}

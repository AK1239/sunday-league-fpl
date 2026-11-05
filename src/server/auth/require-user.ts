import { connection } from "next/server";
import type { UserSession } from "./session";
import { getUserSession } from "./session";
import { UnauthorizedError } from "./require-admin";

export async function requireUser(): Promise<UserSession> {
  await connection();
  const session = await getUserSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

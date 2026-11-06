import type { AdminSession } from "./session";
import { getUserSession } from "./session";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getUserSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  if (session.role !== "admin") {
    throw new ForbiddenError();
  }
  return { ...session, adminId: session.userId };
}

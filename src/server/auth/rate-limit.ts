import { LOGIN_RATE_LIMIT } from "./constants";

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

function keyFor(identifier: string): string {
  return identifier.toLowerCase();
}

export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const key = keyFor(identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= LOGIN_RATE_LIMIT.maxAttempts) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function recordLoginFailure(identifier: string): void {
  const key = keyFor(identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + LOGIN_RATE_LIMIT.windowMs,
    });
    return;
  }

  entry.count += 1;
}

export function clearLoginFailures(identifier: string): void {
  store.delete(keyFor(identifier));
}

/** Test helper */
export function resetLoginRateLimits(): void {
  store.clear();
}

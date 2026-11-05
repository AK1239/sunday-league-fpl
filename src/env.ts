import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine((value) => /^postgres(ql)?:\/\//.test(value), {
        message: "DATABASE_URL must be a postgres:// or postgresql:// URL",
      }),
    SESSION_SECRET: z.string().min(32).optional(),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(12).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.SESSION_SECRET) {
      ctx.addIssue({
        code: "custom",
        message: "SESSION_SECRET is required in production (min 32 characters)",
        path: ["SESSION_SECRET"],
      });
    }
    if (value.ADMIN_EMAIL && !value.ADMIN_PASSWORD) {
      ctx.addIssue({
        code: "custom",
        message: "ADMIN_PASSWORD is required when ADMIN_EMAIL is set",
        path: ["ADMIN_PASSWORD"],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated environment, parsed lazily so `next build` works without secrets. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

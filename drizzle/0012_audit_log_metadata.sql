ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "ip_address" text;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "user_agent" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_at_idx" ON "audit_log" ("at" DESC);

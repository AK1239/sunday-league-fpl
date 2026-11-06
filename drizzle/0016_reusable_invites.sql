ALTER TABLE "manager_invites" ADD COLUMN "reusable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "manager_invites" ADD CONSTRAINT "manager_invites_reusable_reset_exclusive" CHECK (NOT ("reusable" = true AND "reset_user_id" IS NOT NULL));--> statement-breakpoint

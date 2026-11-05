CREATE TYPE "public"."user_role" AS ENUM('manager', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
ALTER TABLE "admin_users" RENAME TO "users";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" text;--> statement-breakpoint
UPDATE "users" SET "display_name" = split_part("email", '@', 1) WHERE "display_name" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "linked_player_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_linked_player_id_players_id_fk" FOREIGN KEY ("linked_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_linked_player_id_unique" ON "users" ("linked_player_id") WHERE "linked_player_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "admin_user_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "audit_log" RENAME COLUMN "admin_id" TO "user_id";--> statement-breakpoint
CREATE TABLE "manager_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"linked_player_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by_user_id" uuid,
	"reset_user_id" uuid,
	CONSTRAINT "manager_invites_token_hash_unique" UNIQUE("token_hash")
);--> statement-breakpoint
ALTER TABLE "manager_invites" ADD CONSTRAINT "manager_invites_linked_player_id_players_id_fk" FOREIGN KEY ("linked_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_invites" ADD CONSTRAINT "manager_invites_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_invites" ADD CONSTRAINT "manager_invites_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manager_invites" ADD CONSTRAINT "manager_invites_reset_user_id_users_id_fk" FOREIGN KEY ("reset_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

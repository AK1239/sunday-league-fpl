ALTER TYPE "public"."point_kind" ADD VALUE IF NOT EXISTS 'hat_trick';--> statement-breakpoint
ALTER TABLE "scoring_rule_sets" ADD COLUMN IF NOT EXISTS "hat_trick_pts" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
UPDATE "scoring_rule_sets" SET "hat_trick_pts" = 5 WHERE "hat_trick_pts" IS NULL;

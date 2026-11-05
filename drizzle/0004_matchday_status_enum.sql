ALTER TYPE "matchday_status" ADD VALUE IF NOT EXISTS 'scheduled' BEFORE 'draft';--> statement-breakpoint
ALTER TYPE "matchday_status" ADD VALUE IF NOT EXISTS 'cancelled';

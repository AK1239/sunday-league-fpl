ALTER TABLE "players" ADD COLUMN "kit_key" text;
--> statement-breakpoint
-- Backfill known squad shirts (same logic as former name-based map in lib/kits.ts)
UPDATE "players" SET "kit_key" = v.k
FROM (VALUES
  ('akil', 'chelsea'),
  ('yusuf', 'liverpool'),
  ('lolo', 'liverpool'),
  ('jeff', 'liverpool'),
  ('murti', 'newcastle'),
  ('chapati', 'psg'),
  ('ali', 'rangerover'),
  ('ajam', 'manutd'),
  ('michu', 'manutd'),
  ('june', 'manutd'),
  ('garnacho', 'neutral'),
  ('spana', 'neutral'),
  ('alaqmar', 'neutral'),
  ('dula', 'neutral'),
  ('dulli', 'chelsea'),
  ('nasir', 'neutral'),
  ('soldier', 'neutral')
) AS v(name_lower, k)
WHERE lower(trim("players"."display_name")) = v.name_lower
  AND "players"."kit_key" IS NULL;

-- Dulli, Nasir, Soldier as separate players from Dula; Jeff inactive by default; Dulli → Chelsea kit.
UPDATE "players"
SET "active" = false
WHERE lower(trim("display_name")) = 'jeff';

UPDATE "players"
SET "kit_key" = 'chelsea'
WHERE lower(trim("display_name")) = 'dulli';

INSERT INTO "players" ("display_name", "kit_key", "active", "joined_on")
SELECT v.display_name, v.kit_key, v.active, v.joined_on::date
FROM (VALUES
  ('Dulli', 'chelsea', true, '2026-11-01'),
  ('Nasir', NULL::text, true, '2026-11-01'),
  ('Soldier', NULL::text, true, '2026-11-01')
) AS v(display_name, kit_key, active, joined_on)
WHERE NOT EXISTS (
  SELECT 1
  FROM "players" p
  WHERE lower(trim(p.display_name)) = lower(trim(v.display_name))
);

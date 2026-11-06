# Enabling transfers

Transfers are controlled by **`transfers_start_matchday`** on the season’s scoring rule set.

| Value | Behaviour |
|--------|-----------|
| **`null`** | Transfers off — managers can pick any five each open gameweek (testing / not configured). |
| **`N` (integer)** | From gameweek **N** onward: squad evolves by **transfers** (free bank, −4 hits, etc.). Earlier gameweeks stay unrestricted. |

Fresh **`pnpm db:seed`** installs use **start gameweek 1** so transfers are on from the first gameweek.

## Before you go live

1. `pnpm db:migrate`
2. **Admin → Transfers** → set **Start gameweek** (e.g. **3** if GW1–2 already happened without transfer rules).
3. Confirm managers have a **base squad** before the first transfer gameweek.

## Admin UI

- If earlier gameweeks are **published** or past deadline, only **Start gameweek** can be set (first time). Free/bank/hit stay at defaults (2 / 3 / 4) until then.
- After transfers are enabled and the season has locked gameweeks, rules are **fixed** for that season.

## SQL (optional)

```sql
UPDATE scoring_rule_sets rs
SET transfers_start_matchday = 3
FROM seasons s
WHERE s.rule_set_id = rs.id AND s.status = 'active';
```

Use the gameweek **number**, not the row id.

## Manager experience

| Situation | `/pick` screen |
|-----------|----------------|
| Transfers off for this GW | Pick any five |
| Transfers on, no squad yet | **Build your squad** (first five free) |
| Transfers on, has base squad | **Transfers** (summary, confirm, history) |

## E2E

```bash
E2E_TRANSFERS=1 pnpm e2e:prepare-transfers
E2E_TRANSFERS=1 pnpm test:e2e tests/e2e/transfers.spec.ts
```

## Chips (opt-in per season)

Chips are **off** until `season_chips` rows exist for that season. Managers only see chip flows when the active season is enabled.

### Enable for the live season

1. `pnpm db:migrate` (includes `0009_chips.sql`).
2. **Admin → Seasons** → **Enable chips** on the active season (server action `enableSeasonChipsAction`), or call `enableChipsForSeason` from a script.
3. By default, **`available_from_matchday`** is the next **scheduled/draft** gameweek number (or `1` if none exist). Override with an explicit gameweek when enabling.

This inserts four rows (`triple_captain`, `wildcard`, `free_hit`, `bench_boost`) with registry default params. It does **not** create retroactive chip plays.

### Rollback

Set `enabled = false` on `season_chips` rows (or delete rows only if no plays reference them). Past `manager_chip_plays` stay as history.

### Cancelled gameweeks

When a gameweek is cancelled, active chip plays on that matchday are **voided** (refunded for inventory), pending squads are removed, and transfer windows are voided — same transaction as transfers (see `CHIPS_PLAN.md` §6).

### Admin

- **Admin → Chips** — usage table, void/refund, force-activate, season chip configuration (locked after the first locked gameweek).

### E2E

```bash
E2E_CHIPS=1 pnpm e2e:prepare-chips
E2E_CHIPS=1 pnpm test:e2e tests/e2e/chips.spec.ts
```

Requires transfer mode (the prepare script runs `e2e-prepare-transfers` first). Full product plan: [`CHIPS_PLAN.md`](./CHIPS_PLAN.md).

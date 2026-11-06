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

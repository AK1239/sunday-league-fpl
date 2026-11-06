# Enabling transfers on a live season

Transfers stay **off** while `scoring_rule_sets.transfers_start_matchday` is `null` (legacy “pick any five” every gameweek).

## Before you switch on

1. Apply migration `0008_transfers.sql` (included in normal `pnpm db:migrate`).
2. Confirm integration tests pass with the flag off (`pnpm test`).
3. Pick the **first gameweek that should use transfer rules** — typically the next **scheduled** gameweek that has not passed its deadline (plan default: GW3 on a fresh season).

## Enable (admin UI)

1. Open **Admin → Transfers**.
2. Under **Transfer rules**, set **Start gameweek** (e.g. `3`). Leave empty to keep transfers off.
3. Adjust **Free per GW**, **Bank cap**, and **Hit per extra** if needed (defaults: 2 / 3 / 4).
4. Save. Rules are **locked** once any gameweek in that season is published or past deadline.

Managers with a squad from earlier gameweeks keep that squad as their **base**; the first transfer window grants **2** free transfers (no retroactive penalties).

## Enable (SQL)

```sql
UPDATE scoring_rule_sets rs
SET transfers_start_matchday = 3
FROM seasons s
WHERE s.rule_set_id = rs.id
  AND s.status = 'active';
```

Use the gameweek **number**, not the row id.

## Rollback

Set `transfers_start_matchday` back to `null` for **future** open gameweeks only. Existing transfer rows remain as history; managers fall back to legacy picks until you re-enable.

## Monitoring

- **Admin → Transfers**: activity table, penalty report, free-transfer grants (audited).
- Manager **Transfers** screen at `/pick` when rules apply and they have a base squad.

## E2E with transfers

Optional Playwright run against a prepared DB:

```bash
E2E_TRANSFERS=1 pnpm exec tsx scripts/e2e-prepare-transfers.ts
E2E_TRANSFERS=1 pnpm test:e2e tests/e2e/transfers.spec.ts
```

Without `E2E_TRANSFERS=1`, transfer-specific E2E tests skip.

# Niguri Honda — Pigment build notes

Live build state in the **Niguri Honda** application
(`fe2d11ca-b44f-463b-af8c-3912ffccde00`, org Viridian). Durable record of what
exists in Pigment, IDs, formulas, verification, and decisions — so the build can
be resumed or audited independently of the chat session.

_Illustrative demonstration model — not a solution design._

## Phase 1 — crux (proven, artefacts deleted)

Subset→parent-calendar projection works via a date-shift:
`<metric on Production Week>[BY: TIMEDIM('Production Week'.'Start Date' + offset*7, Week)]`.
A value at Production Week W+6 projected with offset 3 landed at Calendar Week
W+9. This is the load-bearing pattern reused across the journey layer (L3).

## Calendar

Native Week calendar `ce9090bd-…`, **2026-01-01 → 2027-12-31** (extended by the
user from 2026-only). W0 = Mon 2026-08-10. Production Week subset
`cbaed181-…` spans WC 2025-12-29 → WC 2027-12-27 (superset of the cohort range;
extra weeks are harmless/blank).

## Dimensions (folder `1. Dimensions`)

| Dimension | ID | Members |
|---|---|---|
| Base Model | `5c859816-…` | Civic, CR-V, HR-V, Jazz, e:Ny1 |
| Drive Hand | `6b292797-…` | LHD, RHD |
| Model (variant) | `6d076d70-…` | 10 = base × drive hand; props Base Model, Drive Hand |
| Market | `c19081c3-…` | 11 (UK, Ireland = RHD; other 9 = LHD); prop Drive Hand |
| Status | `4a373573-…` | 7 Honda statuses (presentation only), prop Order |
| Sell Offset | `7f05c86a-…` | Sell +2/+3/+4, prop Offset Weeks |

## Input metrics (folder `2. Inputs`) — loaded via MCP

| Metric | ID | Grain | Loaded |
|---|---|---|---|
| Prod to Ship Weeks | `b66f5808-…` | Base Model | ✓ (1,1,2,2,2) |
| Transit Weeks | `428f2cc9-…` | Market | ✓ |
| Inbound Lag Weeks | `70d41e00-…` | Market | ✓ |
| Sell-Through Weight | `746ccaae-…` | Market × Sell Offset | ✓ (40/40/20; south 30/40/30) |
| Priority Weight | `6a26c014-…` | Market | ✓ (all 1.0) |
| Min Allocation Pct | `fad3e4bd-…` | Market | ✓ (Poland .03, Portugal .02) |
| Target Cover Weeks | `4ad121a1-…` | scalar | ✓ (8) |
| Production Plan Units | `077e6b1b-…` | Model × Production Week | ✓ W-26..W+25 (W+26.. deferred) |
| Allocation Actual Units | `ab440bf0-…` | Model × Prod Week × Market | structure only (deferred) |
| Demand Rate | `9b9eb9da-…` | Model × Market | ✓ (weekly-avg rate) |

## Calculation metrics (folder `3. Calculations`)

| Metric | ID | Formula (essence) |
|---|---|---|
| Alloc Floored Weight | `ea611d0a-…` | `IF(Demand>0, MAX(Demand*Priority / (…)[REMOVE:Market], MinPct), 0)` |
| Allocation Share | `1716434d-…` | `Floored / Floored[REMOVE: Market]` (sums to 1 over eligible markets) |
| Allocated Units | `7d84fab0-…` | `Production Plan Units * Allocation Share` (L2) |
| Units Shipped | `ba5a5a1e-…` | `Allocated[BY: TIMEDIM(StartDate + prod→ship*7, Week)]` |
| Units Arrived | `f5ffd397-…` | `+ transit` |
| Units Into Stock | `dad73ed6-…` | `+ transit + inbound` |
| Units Sold | `5fb6cb0b-…` | `(Allocated*SellWeight)[BY: TIMEDIM(StartDate + (…+SellOffset)*7, Week)]` |
| Stock On Hand | `39cc6261-…` | `CUMULATE(Into Stock,Week) − CUMULATE(Sold,Week)` |
| Cover Weeks | `a8319bda-…` | `IF(Demand>0, Stock On Hand / Demand, BLANK)` |
| Production On Calendar | `36a47072-…` | `Production[BY: TIMEDIM(StartDate, Week)]` (offset 0) |
| Allocation Conservation Check | `e30e0470-…` | `Production − Allocated[REMOVE: Market]` (=0) |
| Slice Ship/Arrival/Stock/Sale Peak Date | `08ddf3a8/5395f151/ee196adc/d91bd1e4-…` | per-slice journey dates for B1 |

Golden rules honoured: no recursion, offsets not loops, statuses are
aggregations, each layer reads only the one above. `Prod to Ship Weeks` is
mapped Base Model→Model with `[BY: Model.'Base Model']` (required for the Date
metrics; numeric metrics align implicitly).

## Verification (live queries)

- **Conservation**: Allocation Conservation Check = 0.00 for every cohort week.
- **Drive-hand constraint**: Civic LHD W+6 → UK 0, Ireland 0; 514 units split
  across the 9 LHD markets, summing to 514.
- **Hero narrative**: Civic LHD W+6 peak sale dates — Germany 2026-11-30 (Nov),
  Portugal 2027-01-25 (Jan); UK/Ireland absent. Portugal transit 12→10 moves it
  ~2 weeks earlier (still January).

## Key decisions / deviations

1. **Transit compressed** (North 4–7 / South 9–12 vs plan's 8–9/10–12) so the
   locked hero narrative holds. Portugal = 12 for the scripted 12→10 edit.
2. **Allocation seals only the past (≤W0)**; forward cohorts (incl. hero W+6)
   are L2-policy-allocated, so Beat 3 (raise W+6 → rebalance) works.
3. **L2 = demand×priority share, floored, normalised** (acyclic). The full
   cover-gap iterative allocation is the production variant (Q&A depth).
4. **Demand loaded as a weekly-avg rate** per Model×Market (compact) rather than
   3,978 weekly cells; drives cover/allocation identically for the demo.
5. **Deferred loads** (structures exist, data loadable later from the CSVs):
   far-forward production (W+26..W+51), sealed allocation actuals, and the
   registrations/floating-shipments actuals splice (Q&A depth — L3 already
   projects a coherent history from the same journey logic).

## Remaining

- Phase 4 boards (B0 Landing, B1 Cohort Trace, B2 Supply & Allocation, B3
  Compare), Working/Base scenarios, watermark + styling.

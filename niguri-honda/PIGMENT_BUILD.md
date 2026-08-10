# Niguri Honda — Pigment build (complete inventory)

Everything built in the **Niguri Honda** application
(`fe2d11ca-b44f-463b-af8c-3912ffccde00`, org Viridian). This is the authoritative
as-built record: every block, its contents, and for each metric its
dimensionality and exact formula. Validated live (see §7).

_Illustrative demonstration model — not a solution design._

---

## 1. Folders
`1. Dimensions` · `2. Inputs` · `3. Calculations` · `Calendar` (native)

## 2. Calendar
- **Week** `5dc88b0f` — native, **2026-01-01 → 2027-12-31**, Monday start; rollups Month `3e097e78`, Quarter `fdfc1ef6`, Year `0ac23d61`. W0 = Mon 2026-08-10.
- **Production Week** `cbaed181` — **subset of Week** (cohort axis), WC 2025-12-29 → WC 2027-12-27. Properties are `[TOSUBSET]` pulls from Week: Start Date, End Date, Start of Next Period, Month, Quarter, Year, Week of Year, WC text formats.

## 3. Dimensions (folder `1. Dimensions`)

| Dimension | ID | Members | Properties |
|---|---|---|---|
| Base Model | `5c859816` | Civic, CR-V, HR-V, Jazz, e:Ny1 | Name |
| Drive Hand | `6b292797` | LHD, RHD | Name |
| Model | `6d076d70` | 10 = base × drive hand (Civic LHD, Civic RHD, …) | Name; Base Model (→Base Model); Drive Hand (→Drive Hand) |
| Market | `c19081c3` | 11 — UK, Ireland *(RHD)*; Germany, France, Italy, Spain, Netherlands, Belgium, Poland, Nordics, Portugal *(LHD)* | Name; Drive Hand (→Drive Hand) |
| Status | `4a373573` | Planned Production, Shipment, Floating, Arrival, Stock, Wholesale, Registration | Name; Order (1–7). Presentation only. |
| Sell Offset | `7f05c86a` | Sell +2, Sell +3, Sell +4 | Name; Offset Weeks (2,3,4) |

## 4. Input metrics (folder `2. Inputs`)

| Metric | ID | Dimensionality | Values |
|---|---|---|---|
| Prod to Ship Weeks | `b66f5808` | Base Model | Civic 1, CR-V 1, HR-V 2, Jazz 2, e:Ny1 2 |
| Transit Weeks | `428f2cc9` | Market | UK 4, Ireland 5, Germany 5, France 6, NL 5, Belgium 6, Nordics 7, Poland 7, Spain 9, Italy 10, Portugal 12 |
| Inbound Lag Weeks | `70d41e00` | Market | 1 (Spain/Italy/Portugal = 2) |
| Sell-Through Weight | `746ccaae` | Market × Sell Offset | 0.4/0.4/0.2; South (IT/ES/PT) 0.3/0.4/0.3 |
| Priority Weight | `6a26c014` | Market | 1.0 |
| Min Allocation Pct | `fad3e4bd` | Market | Poland 0.03, Portugal 0.02, else 0 |
| Target Cover Weeks | `4ad121a1` | *(scalar)* | 8 |
| Production Plan Units | `077e6b1b` | Model × Production Week | input; loaded W-26→W+25 |
| Allocation Actual Units | `ab440bf0` | Model × Production Week × Market | input; empty (deferred) |
| Demand Rate | `9b9eb9da` | Model × Market | input; weekly-avg rate (drive-hand-matched) |

## 5. Calculation metrics (folder `3. Calculations`) — dimensionality + exact formula

### L2 — allocation
- **Alloc Floored Weight** `ea611d0a` — *Model × Market*
  `IF('Demand Rate' > 0, MAX('Demand Rate' * 'Priority Weight' / ('Demand Rate' * 'Priority Weight')[REMOVE: Market], 'Min Allocation Pct'), 0)`
- **Allocation Share** `1716434d` — *Model × Market*
  `IF('Alloc Floored Weight'[REMOVE: Market] > 0, 'Alloc Floored Weight' / 'Alloc Floored Weight'[REMOVE: Market], 0)`
- **Allocated Units** `7d84fab0` — *Model × Market × Production Week*
  `'Production Plan Units' * 'Allocation Share'`

### Per-slice journey dates (Date-typed) — *Model × Market × Production Week*
- **Slice Ship Date** `08ddf3a8`
  `IF('Allocated Units' > 0, 'Production Week'.'Start Date' + 'Prod to Ship Weeks'[BY: Model.'Base Model'] * 7, BLANK)`
- **Slice Arrival Date** `5395f151`
  `IF('Allocated Units' > 0, 'Production Week'.'Start Date' + ('Prod to Ship Weeks'[BY: Model.'Base Model'] + 'Transit Weeks') * 7, BLANK)`
- **Slice Stock Date** `ee196adc`
  `IF('Allocated Units' > 0, 'Production Week'.'Start Date' + ('Prod to Ship Weeks'[BY: Model.'Base Model'] + 'Transit Weeks' + 'Inbound Lag Weeks') * 7, BLANK)`
- **Slice Sale Peak Date** `d91bd1e4`
  `IF('Allocated Units' > 0, 'Production Week'.'Start Date' + ('Prod to Ship Weeks'[BY: Model.'Base Model'] + 'Transit Weeks' + 'Inbound Lag Weeks' + 3) * 7, BLANK)`

### Calendar-week mapping refs (Dimension→Week typed)
- **Ship Week Ref** `d36b2454` — *Model × Market × Production Week* · `TIMEDIM('Slice Ship Date', Week)`
- **Arrival Week Ref** `18dcc035` — *Model × Market × Production Week* · `TIMEDIM('Slice Arrival Date', Week)`
- **Stock Week Ref** `d47ba0c2` — *Model × Market × Production Week* · `TIMEDIM('Slice Stock Date', Week)`
- **Sale Week Ref** `dda479c6` — *Model × Market × Production Week × Sell Offset* · `TIMEDIM('Slice Stock Date' + 'Sell Offset'.'Offset Weeks' * 7, Week)`

### L3/L4 — status projection onto the calendar (arrow-mapped, preserves Model & Market) — *Model × Market × Week*
- **Units Shipped** `ba5a5a1e` · `'Allocated Units'[BY: 'Production Week' -> 'Ship Week Ref', Model, Market]`
- **Units Arrived** `f5ffd397` · `'Allocated Units'[BY: 'Production Week' -> 'Arrival Week Ref', Model, Market]`
- **Units Into Stock** `dad73ed6` · `'Allocated Units'[BY: 'Production Week' -> 'Stock Week Ref', Model, Market]`
- **Units Sold** `5fb6cb0b` · `('Allocated Units' * 'Sell-Through Weight')[BY: 'Production Week', 'Sell Offset' -> 'Sale Week Ref', Model, Market]`
- **Stock On Hand** `39cc6261` · `CUMULATE('Units Into Stock', Week) - CUMULATE('Units Sold', Week)`

### L5 — insight — *Model × Market × Week*
- **Cover Weeks** `a8319bda` (pipeline-inclusive) · `IF('Demand Rate' > 0, (CUMULATE('Units Shipped', Week) - CUMULATE('Units Sold', Week)) / 'Demand Rate', BLANK)`

### Display / QA
- **Production On Calendar** `36a47072` — *Model × Week* · `'Production Plan Units'[BY: TIMEDIM('Production Week'.'Start Date', Week)]`
- **Allocation Conservation Check** `e30e0470` — *Model × Production Week* · `'Production Plan Units' - 'Allocated Units'[REMOVE: Market]`

## 6. Golden rules honoured
No recursion; offsets not loops; statuses are aggregations (not calc members); each layer reads only the one above; conservation exact. Base Model→Model is mapped explicitly with `[BY: Model.'Base Model']`.

## 7. Validation (live queries)

| Check | Result |
|---|---|
| Conservation (all cohorts) | Allocation Conservation Check = 0.00 ✓ |
| Drive-hand — LHD model | Civic LHD W+6 → UK 0, Ireland 0; 514 units across 9 LHD markets = 514 ✓ |
| Drive-hand — RHD model | Civic RHD W+6 → UK 163, Ireland 19, all LHD = 0 (sum 182) ✓ |
| Production load vs source | WC 2026-09-21 total = 2,386 (matches CSV) ✓ |
| Allocation share sums to 1 | Civic LHD 1.00, Civic RHD 1.00 ✓ |
| Journey per market | Into-stock Civic LHD Germany ~128–131/wk, France ~94–96/wk (distinct) ✓ |
| Hero narrative | Civic LHD W+6 peak sale: Germany 2026-11-30 (Nov), Portugal 2027-01-25 (Jan) ✓ |
| Cover varies (pipeline) | Civic LHD @ WC 2026-12-14: Germany 8.9, France 10.0, Portugal 17.2 ✓ |

**Bug found & fixed during validation:** the journey metrics originally used `[BY: TIMEDIM(...)]` where the mapping depended on Model (`Prod to Ship`) and Market (`Transit`/`Inbound`); a `BY` remap collapses any dimension its mapping depends on, so Model & Market were aggregated away (every slice showed the all-model total). Fixed by moving the offsets into **dimension-typed mapping refs** and projecting with the **arrow syntax** `[BY: 'Production Week' -> 'Ship Week Ref', Model, Market]`, which preserves Model & Market. Re-verified above.

## 8. Key decisions / deviations
1. Transit compressed (North 4–7 / South 9–12) so the locked hero narrative holds; Portugal 12 for the scripted 12→10 edit.
2. Allocation seals only the past (≤W0); forward cohorts (incl. hero W+6) are L2-policy-allocated so Beat 3 (raise W+6 → rebalance) works.
3. L2 = demand×priority share, floored, normalised (acyclic). Full cover-gap iterative allocation is the production variant (Q&A depth).
4. Demand loaded as a weekly-avg rate per Model×Market (compact); drives cover/allocation identically for the demo.
5. Deferred (structures exist, loadable from CSVs): far-forward production (W+26→W+51), sealed allocation actuals, registrations/floating-shipments actuals splice.

## 9. Remaining
Phase 4 — boards (B0 Landing, B1 Cohort Trace, B2 Supply & Allocation, B3 Compare), Working/Base scenarios, watermark + styling. Not yet started.

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

## 9. Build Review v1 — corrections status

**C1 — allocation rebuilt as snapshot cover-gap (DONE, checkpoint passed).**
New metrics (folder `3. Calculations`):
- **Sealed Allocated Units** `e9ade3a4` — *Model × Market × Prod Week* · `IF('Production Week'.'Start Date' <= DATE(2026,8,10), 'Production Plan Units' * 'Allocation Share', BLANK)`
- **Sealed Units Shipped** `ff685955` · `'Sealed Allocated Units'[BY: 'Production Week' -> 'Ship Week Ref', Model, Market]`
- **Sealed Units Sold** `c40ee46a` · `('Sealed Allocated Units' * 'Sell-Through Weight')[BY: 'Production Week','Sell Offset' -> 'Sale Week Ref', Model, Market]`
- **Cover Snapshot** `b1bfb93c` — *Model × Market* (pipeline cover @ W+1, sealed only) · `IF('Demand Rate' > 0, ((CUMULATE('Sealed Units Shipped',Week) - CUMULATE('Sealed Units Sold',Week)) / 'Demand Rate')[SELECT: Week = TIMEDIM(DATE(2026,8,17), Week)], BLANK)`
- **Unit Gap** `86fe9d01` — *Model × Market* (lead-time-adjusted) · `IF('Demand Rate' > 0, MAX(0, ('Target Cover Weeks' + 'Transit Weeks' + 'Inbound Lag Weeks') - 'Cover Snapshot') * 'Demand Rate' * 'Priority Weight', 0)`
- **Forward Gap Share** `e90d2d17` · `IF('Unit Gap'[REMOVE: Market] > 0, 'Unit Gap' / 'Unit Gap'[REMOVE: Market], 'Allocation Share')`
- **Floor Units** `8f6275c7` · `IF('Demand Rate' > 0, 'Production Plan Units' * 'Min Allocation Pct', 0)`
- **Landed Cover** `eb0613a9` — *Model × Market* (C3.3 gauge basis) · `'Cover Snapshot' - ('Transit Weeks' + 'Inbound Lag Weeks')`
- **Allocated Units** `7d84fab0` rewritten · `IF('Production Week'.'Start Date' <= DATE(2026,8,10), 'Sealed Allocated Units', 'Floor Units' + ('Production Plan Units' - 'Floor Units'[REMOVE: Market]) * 'Forward Gap Share')`

Design note: gap benchmarked against **Target + Transit + Inbound** (lead-time-adjusted days'-supply), so long-transit markets aren't structurally starved by a flat target. Slice-date metrics re-gated on `Demand Rate > 0` (was `Allocated Units > 0`) to break a circular dependency. Acyclic: sealed chain → Cover Snapshot → gap → forward allocation.

C1 checkpoint results: conservation = 0 (±1e-14) on all cohorts; Poland W+6 = 8.6% (≥3% floor ✓); acceptance test — raising Germany demand 120→144 lifted Germany's W+6 share 125.2→140.1 and dropped its Landed Cover 2.48→2.08 (allocation chases demand). Baseline Landed Cover clusters ~2.5–3 across markets (calm opening screen — by design).

**C2 — deferred actuals loaded in strict order (DONE, checkpoint passed).**
- **C2.1** far-forward production plan extended (W+26→W+51) into `Production Plan Units` `077e6b1b`.
- **C2.2** sealed **Allocation Actual Units** `ab440bf0` loaded — 854 rows, all Production Week ≤ W0 (2026-08-10). **Sealed Allocated Units** `e9ade3a4` rewritten *actuals-preferred*: `IF('Production Week'.'Start Date' <= DATE(2026,8,10), IF('Allocation Actual Units'[REMOVE: Market] > 0, 'Allocation Actual Units', 'Production Plan Units' * 'Allocation Share'), BLANK)` — real allocations where they exist, policy fallback otherwise.
- **C2.3** actuals overlays loaded: **Registrations Actual** `6fec17e4` = 1,326 rows (56,499 units); **Floating Shipment Actual** `0b56e3b2` = 898 rows (63,417 units). Dims Model × Market × Week ("WC yyyy-mm-dd").

C2 checkpoint results:
- Row counts match spec (reg 1,326 · floating 898 · alloc actuals 854, all ≤ W0).
- **No-seams drill (hero, PASS):** Civic LHD `Allocated Units` = `Production Plan Units` for every cohort straight across the seal boundary (07-13 sealed → 08-10 W0 → 09-07 forward). Sealed (actuals-driven) and forward (model-driven) cohorts both reconcile exactly to production — no discontinuity.
- **Conservation across sealed cohorts:** clean. Fixed one material seam — `e:Ny1 LHD` @ Prod Week 07-20 was +22 (Belgium/Nordics allocation-actual rows dropped by the generator seed); patched Belgium 10 / Nordics 12 by demand split (15:18). Residual ±1 at 05-18 (+1) / 06-01 (−1) are integer-rounding of actuals (net ≈ 0), left as honest tolerance.
- Calendar-edge decision: **no extension needed** — all cohort journeys land inside 2027-12-31.

**C3 — pipeline + wholesale/registration layer (DONE).**
New/changed blocks:
- **Units Floating** `0626e062` — *Model × Market × Week* · `CUMULATE('Units Shipped', Week) - CUMULATE('Units Arrived', Week)` (modelled in-transit stock; Civic LHD Germany ≈ 630 ≈ 5-wk transit × ship rate ✓).
- **Registration Lag Weeks** `9e4bd23b` — *Market* input (wk): UK/IE/DE/FR/NL/BE 2, Nordics/PL/ES/IT 3, PT 4.
- **Registration Week Ref** `f86c4e26` — *Model × Sell Offset × Market × Production Week*, Week-typed · `TIMEDIM('Sale Week Ref'.'Start Date' + 'Registration Lag Weeks' * 7, Week)`.
- **Units Registered** `f2c83641` — *Model × Market × Week* · `('Allocated Units' * 'Sell-Through Weight')[BY: 'Production Week','Sell Offset' -> 'Registration Week Ref', Model, Market]`. Verified exact per-market lag (Germany 2 wk: Units Sold WC 11-02 = 98.6 → Units Registered WC 11-16 = 98.6).
- Modelling note (self-remap): shifting a metric already indexed by Week onto Week (`[BY: Week -> ref]`) requires an explicit aggregator; the clean pattern is to remap from the cross-dimension source (Production Week × Sell Offset), exactly as Units Sold does.
- **Open item for board build:** `Floating Shipment Actual` data reads as a weekly departure *flow* (~100/cell), whereas `Units Floating` is in-transit *stock* (~630) — not co-plottable on one axis. Decision pending: keep Units Floating as modelled pipeline stock and show the actual as its own historical series.
- Gauge→Landed Cover wiring is a board-widget config (Step 4).

**Step 3 — Target Cover = 3 + C1 re-verification (DONE).**
- **Target Cover Weeks** `4ad121a1` 8 → **3** (scalar).
- Gauge bands (for Step-4 widgets): constrained < 2 · balanced 2–4 · aging > 5, on **Landed Cover**.
- C1 re-verified (Civic LHD): Landed Cover Italy 1.34 / Spain 1.45 / NL 1.77 (constrained) · DE 2.62 / FR 2.67 / PL 2.42 / BE 3.23 / PT 3.75 / Nordics 3.84 (balanced) · none aging. Unit Gap tracks cover ordering — Italy 94.8 > Spain 79.1 > NL 46.6 > DE 45.6 > FR 29.0 > PL 16.2 > BE/Nordics/PT 0; UK/Ireland 0 (LHD model × RHD market drive-hand block ✓). Gaps positive → forward allocation stays gap-driven.

## 10. Boards (folder root) — Step 4

Four presentation boards, all full-width, Model preselected to **Civic LHD** (B1 also preselects Production Week **W+6 = WC 2026-09-21**). Supporting Table blocks live in `3. Calculations`.

- **B0 · Landing** `c5e67b7b` — exec homepage. Widgets: *Pipeline cascade* line (`1e7db7dd` on table **Pipeline Flow** `e7657451` = Units Shipped/Arrived/Into Stock/Sold, rows Week, page Model) + *Wholesale vs Registration* line (`63ac4670` on table **Wholesale vs Registration** `46deae9e` = Units Sold / Units Registered).
- **B1 · Cohort Trace** `2b09f743` — the hero. *Cohort journey by market* table (`63d5254a` on table **Cohort Trace** `6923a5c1` = Allocated Units + Slice Ship/Arrival/Stock/Sale Date + Landed Cover; rows Market; pages Model + Production Week). **Filter Allocated Units > 0** (suppresses drive-hand-blocked + zero-gap phantom rows). Verified: Civic LHD W+6 shows 7 markets (Italy 148.7 … Portugal 10.3), UK/Ireland/Belgium/Nordics hidden.
- **B2 · Supply & Allocation** `ebb00ac6` — *Cover & allocation by market* table (`9c35eec6` on table **Cover & Allocation** `3325e817` = Demand Rate, Allocation Share, Cover Snapshot, Landed Cover, Unit Gap; rows Market **sorted by Landed Cover asc** so constrained markets surface first) + *Allocation share* horizontal bar (`893bc4d6`). Gauge bands (constrained<2 / balanced 2–4 / aging>5) stated in guidance text.
- **B3 · Compare** `4d575407` — static, no scenarios. *Total unit gap by model* bar (`69ffb65e`) + *Landed cover — model × market* matrix (`e0e087e8`). Verified gap ranking: e:Ny1 LHD 351 > CR-V LHD 312 > Civic LHD 311; RHD variants ~half (2 markets vs 9).
- **B4 · How It Thinks** `b1af592d` + **Frame F4 · How It Thinks** `9763a9fb` (published) — the transparency proof (kicker `05 · NOTHING HIDDEN`, sits between B2 and B3). A static, self-contained Pigment AI Frame: the whole model as a left-to-right flow of **16 nodes** (Honda-red assumptions → charcoal calculations → white/red-accent outputs, on white) over **28 edges** drawn as square right-angle connectors with arrowheads, grouping all 43 metrics. Plain-language node names + hand-written hover copy (no jargon); serif titles (Palatino/Georgia system stack, no imported fonts). Hover a node → plain-language 3-line card + its full causal chain lights (others dim to 20%); click a gold input → a ripple pulses every downstream edge to the outputs. Content baked in (no data binding, by design). Source: `niguri-honda/frames/F4_how_it_thinks.js`. **Placement:** the frame is published (renders for all viewers) but the frame-widget must be dropped onto B4 in the UI — the board automation API exposes no Frame widget type; B4 carries a builder note with the one manual step.

**Known limitations (MCP surface):** per-cell conditional formatting (the Landed-Cover band *colours*) is not exposed via the MCP tool set — bands are conveyed by guidance text + tightest-first sort. Live click-path timing (<2s recalc target) and exported still images require the Pigment UI and can't be driven headlessly; the underlying data for every board has been query-verified instead.

**Remaining:** C4 polish (weighted-average sale week to replace the hardcoded +3 in Slice Sale Peak Date), optional. Scenarios out of scope.

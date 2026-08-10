# Niguri Honda — Complete Block Inventory

Live as-built snapshot of every block in the **Niguri Honda** application
(`fe2d11ca-b44f-463b-af8c-3912ffccde00`, org Viridian). Pulled directly from the
model. Totals: **8 dimensions** (2 calendar + 6 business), **13 input metrics**
(assumptions + actuals), **30 calculation metrics**, **4 tables**, **4 boards**.

_Illustrative demonstration model — not a solution design._

W0 (demo "today") = **Mon 2026-08-10**. Seal boundary = Production Weeks with Start Date ≤ 2026-08-10.

---

## 1. Folders

`1. Dimensions` · `2. Inputs` · `3. Calculations` · `Calendar` (native)

---

## 2. Calendar

| Block | ID | Type | Detail |
|---|---|---|---|
| **Week** | `5dc88b0f` | Native calendar | 2026-01-01 → 2027-12-31, Monday start. Rollups: Month `3e097e78`, Quarter `fdfc1ef6`, Year `0ac23d61`. W0 = Mon 2026-08-10. |
| **Production Week** | `cbaed181` | Subset of Week | Cohort axis, WC 2025-12-29 → WC 2027-12-27 (105 members). Properties are `[TOSUBSET]` pulls from Week: Start Date, End Date, Start of Next Period, Month, Quarter, Year, Week of Year, WC text formats. |

---

## 3. Dimensions (folder `1. Dimensions`)

| Dimension | ID | Members | Properties |
|---|---|---|---|
| **Base Model** | `5c859816` | Civic, CR-V, HR-V, Jazz, e:Ny1 (5) | Name |
| **Drive Hand** | `6b292797` | LHD, RHD (2) | Name |
| **Model** | `6d076d70` | 10 = Base × Drive Hand (Civic LHD, Civic RHD, CR-V LHD, … e:Ny1 RHD) | Name; Base Model (→ Base Model); Drive Hand (→ Drive Hand) |
| **Market** | `c19081c3` | 11 — UK, Ireland *(RHD)*; Germany, France, Italy, Spain, Netherlands, Belgium, Poland, Nordics, Portugal *(LHD)* | Name; Drive Hand (→ Drive Hand) |
| **Status** | `4a373573` | Planned Production, Shipment, Floating, Arrival, Stock, Wholesale, Registration (7) | Name; Order (1–7). Presentation only. |
| **Sell Offset** | `7f05c86a` | Sell +2, Sell +3, Sell +4 (3) | Name; Offset Weeks (2, 3, 4) |

**Drive-hand rule:** a model can only be allocated to a market whose Drive Hand matches — enforced because Demand Rate = 0 in mismatched market/model cells, so allocation weight and gap are both 0 there.

---

## 4. Input metrics — assumptions & actuals (folder `2. Inputs`)

All are manual-input blocks (values set directly, editable by the demo driver).

### 4a. Lead-time & policy assumptions

| Metric | ID | Data type | By | Current values |
|---|---|---|---|---|
| **Prod to Ship Weeks** | `b66f5808` | Integer | Base Model | Civic 1, CR-V 1, HR-V 2, Jazz 2, e:Ny1 2 |
| **Transit Weeks** | `428f2cc9` | Integer | Market | UK 4, Ireland 5, Germany 5, France 6, Netherlands 5, Belgium 6, Nordics 7, Poland 7, Spain 9, Italy 10, Portugal 12 |
| **Inbound Lag Weeks** | `70d41e00` | Integer | Market | Spain / Italy / Portugal = 2; all others = 1 |
| **Registration Lag Weeks** | `9e4bd23b` | Integer | Market | UK / Ireland / Germany / France / Netherlands / Belgium 2; Nordics / Poland / Spain / Italy 3; Portugal 4 |
| **Sell-Through Weight** | `746ccaae` | Decimal | Sell Offset × Market | Default 0.4 / 0.4 / 0.2 (Sell +2 / +3 / +4); South (IT/ES/PT) 0.3 / 0.4 / 0.3 |
| **Priority Weight** | `6a26c014` | Decimal | Market | 1.0 (all) |
| **Min Allocation Pct** | `fad3e4bd` | Decimal | Market | Poland 0.03, Portugal 0.02, all others 0 |
| **Target Cover Weeks** | `4ad121a1` | Integer | *(scalar)* | **3** |

### 4b. Plan & demand inputs

| Metric | ID | Data type | By | Content |
|---|---|---|---|---|
| **Production Plan Units** | `077e6b1b` | Integer | Model × Production Week | Weekly build plan per model variant (loaded W-26 → W+51) |
| **Demand Rate** | `9b9eb9da` | Integer | Model × Market | Weekly-average retail demand rate (drive-hand-matched; 0 in mismatched cells) |

### 4c. Historical actuals (sealed / overlays)

| Metric | ID | Data type | By | Content |
|---|---|---|---|---|
| **Allocation Actual Units** | `ab440bf0` | Integer | Model × Market × Production Week | Real past allocations, all Production Weeks ≤ W0 (854 rows) |
| **Registrations Actual** | `6fec17e4` | Integer | Model × Market × Week | Retail registration actuals (1,326 rows; 56,499 units) |
| **Floating Shipment Actual** | `0b56e3b2` | Integer | Model × Market × Week | In-transit shipment actuals overlay (898 rows; 63,417 units) |

---

## 5. Calculation metrics (folder `3. Calculations`)

30 metrics. Grouped by role; each row gives data type, dimensionality (**By**) and the exact live formula.

### 5a. Journey week references (Week-dimension-typed mapping metrics)

These convert per-cohort journey dates into Week items so flows can be projected onto the calendar with the arrow-remap `[BY: source -> ref, keep dims]` (preserves Model & Market).

| Metric | ID | Type | By | Formula |
|---|---|---|---|---|
| **Ship Week Ref** | `d36b2454` | Dimension (Week) | Model × Market × Production Week | `TIMEDIM('Slice Ship Date', Week)` |
| **Arrival Week Ref** | `18dcc035` | Dimension (Week) | Model × Market × Production Week | `TIMEDIM('Slice Arrival Date', Week)` |
| **Stock Week Ref** | `d47ba0c2` | Dimension (Week) | Model × Market × Production Week | `TIMEDIM('Slice Stock Date', Week)` |
| **Sale Week Ref** | `dda479c6` | Dimension (Week) | Model × Sell Offset × Market × Production Week | `TIMEDIM('Slice Stock Date' + 'Sell Offset'.'Offset Weeks' * 7, Week)` |
| **Registration Week Ref** | `f86c4e26` | Dimension (Week) | Model × Sell Offset × Market × Production Week | `TIMEDIM('Sale Week Ref'.'Start Date' + 'Registration Lag Weeks' * 7, Week)` |

### 5b. Per-slice journey dates (Date-typed) — By: Model × Market × Production Week

| Metric | ID | Type | Formula |
|---|---|---|---|
| **Slice Ship Date** | `08ddf3a8` | Time | `IF('Demand Rate' > 0, 'Production Week'.'Start Date' + 'Prod to Ship Weeks'[BY: Model.'Base Model'] * 7, BLANK)` |
| **Slice Arrival Date** | `5395f151` | Time | `IF('Demand Rate' > 0, 'Production Week'.'Start Date' + ('Prod to Ship Weeks'[BY: Model.'Base Model'] + 'Transit Weeks') * 7, BLANK)` |
| **Slice Stock Date** | `ee196adc` | Time | `IF('Demand Rate' > 0, 'Production Week'.'Start Date' + ('Prod to Ship Weeks'[BY: Model.'Base Model'] + 'Transit Weeks' + 'Inbound Lag Weeks') * 7, BLANK)` |
| **Slice Sale Peak Date** | `d91bd1e4` | Time | `IF('Demand Rate' > 0, 'Production Week'.'Start Date' + ('Prod to Ship Weeks'[BY: Model.'Base Model'] + 'Transit Weeks' + 'Inbound Lag Weeks' + 3) * 7, BLANK)` |

### 5c. Allocation weights — By: Model × Market (unless noted)

| Metric | ID | Type | By | Formula |
|---|---|---|---|---|
| **Alloc Floored Weight** | `ea611d0a` | Decimal | Model × Market | `IF('Demand Rate' > 0, MAX('Demand Rate' * 'Priority Weight' / ('Demand Rate' * 'Priority Weight')[REMOVE: Market], 'Min Allocation Pct'), 0)` |
| **Allocation Share** | `1716434d` | Decimal | Model × Market | `IF('Alloc Floored Weight'[REMOVE: Market] > 0, 'Alloc Floored Weight' / 'Alloc Floored Weight'[REMOVE: Market], 0)` |
| **Floor Units** | `8f6275c7` | Decimal | Model × Market × Production Week | `IF('Demand Rate' > 0, 'Production Plan Units' * 'Min Allocation Pct', 0)` |

### 5d. Cover-gap engine (sealed pipeline → snapshot → gap → forward share)

| Metric | ID | Type | By | Formula |
|---|---|---|---|---|
| **Sealed Allocated Units** | `e9ade3a4` | Decimal | Model × Market × Production Week | `IF('Production Week'.'Start Date' <= DATE(2026, 8, 10), IF('Allocation Actual Units'[REMOVE: Market] > 0, 'Allocation Actual Units', 'Production Plan Units' * 'Allocation Share'), BLANK)` |
| **Sealed Units Shipped** | `ff685955` | Decimal | Week × Model × Market | `'Sealed Allocated Units'[BY: 'Production Week' -> 'Ship Week Ref', Model, Market]` |
| **Sealed Units Sold** | `c40ee46a` | Decimal | Week × Model × Market | `('Sealed Allocated Units' * 'Sell-Through Weight')[BY: 'Production Week', 'Sell Offset' -> 'Sale Week Ref', Model, Market]` |
| **Cover Snapshot** | `b1bfb93c` | Decimal | Model × Market | `IF('Demand Rate' > 0, ((CUMULATE('Sealed Units Shipped', Week) - CUMULATE('Sealed Units Sold', Week)) / 'Demand Rate')[SELECT: Week = TIMEDIM(DATE(2026, 8, 17), Week)], BLANK)` |
| **Unit Gap** | `86fe9d01` | Decimal | Model × Market | `IF('Demand Rate' > 0, MAX(0, ('Target Cover Weeks' + 'Transit Weeks' + 'Inbound Lag Weeks') - 'Cover Snapshot') * 'Demand Rate' * 'Priority Weight', 0)` |
| **Forward Gap Share** | `e90d2d17` | Decimal | Model × Market | `IF('Unit Gap'[REMOVE: Market] > 0, 'Unit Gap' / 'Unit Gap'[REMOVE: Market], 'Allocation Share')` |
| **Landed Cover** | `eb0613a9` | Decimal | Model × Market | `'Cover Snapshot' - ('Transit Weeks' + 'Inbound Lag Weeks')` |

Cover basis note: `Cover Snapshot` is pipeline-inclusive (shipped − sold) measured one week after W0. `Unit Gap` benchmarks it against a **lead-time-adjusted** target (Target + Transit + Inbound) so long-transit markets aren't structurally starved. `Landed Cover` strips transit + inbound back out for the constraint gauge (bands: constrained < 2 · balanced 2–4 · aging > 5).

### 5e. Allocation output & conservation

| Metric | ID | Type | By | Formula |
|---|---|---|---|---|
| **Allocated Units** | `7d84fab0` | Decimal | Model × Market × Production Week | `IF('Production Week'.'Start Date' <= DATE(2026, 8, 10), 'Sealed Allocated Units', 'Floor Units' + ('Production Plan Units' - 'Floor Units'[REMOVE: Market]) * 'Forward Gap Share')` |
| **Allocation Conservation Check** | `e30e0470` | Decimal | Model × Production Week | `'Production Plan Units' - 'Allocated Units'[REMOVE: Market]` (should be 0) |

Past cohorts (≤ W0) are sealed to actuals-preferred allocations; forward cohorts are floors-first + remainder pro-rata to the lead-time-adjusted gap. Conservation = 0 across the seal boundary (verified, ±1 integer-rounding on two historical weeks).

### 5f. Calendar journey flows & stock

| Metric | ID | Type | By | Formula |
|---|---|---|---|---|
| **Production On Calendar** | `36a47072` | Decimal | Week × Model | `'Production Plan Units'[BY: TIMEDIM('Production Week'.'Start Date', Week)]` |
| **Units Shipped** | `ba5a5a1e` | Decimal | Week × Model × Market | `'Allocated Units'[BY: 'Production Week' -> 'Ship Week Ref', Model, Market]` |
| **Units Arrived** | `f5ffd397` | Decimal | Week × Model × Market | `'Allocated Units'[BY: 'Production Week' -> 'Arrival Week Ref', Model, Market]` |
| **Units Into Stock** | `dad73ed6` | Decimal | Week × Model × Market | `'Allocated Units'[BY: 'Production Week' -> 'Stock Week Ref', Model, Market]` |
| **Units Sold** | `5fb6cb0b` | Decimal | Week × Model × Market | `('Allocated Units' * 'Sell-Through Weight')[BY: 'Production Week', 'Sell Offset' -> 'Sale Week Ref', Model, Market]` |
| **Units Floating** | `0626e062` | Decimal | Week × Model × Market | `CUMULATE('Units Shipped', Week) - CUMULATE('Units Arrived', Week)` |
| **Stock On Hand** | `39cc6261` | Decimal | Week × Model × Market | `CUMULATE('Units Into Stock', Week) - CUMULATE('Units Sold', Week)` |
| **Cover Weeks** | `a8319bda` | Decimal | Week × Model × Market | `IF('Demand Rate' > 0, (CUMULATE('Units Shipped', Week) - CUMULATE('Units Sold', Week)) / 'Demand Rate', BLANK)` |

### 5g. Wholesale → registration

| Metric | ID | Type | By | Formula |
|---|---|---|---|---|
| **Units Registered** | `f2c83641` | Decimal | Week × Model × Market | `('Allocated Units' * 'Sell-Through Weight')[BY: 'Production Week', 'Sell Offset' -> 'Registration Week Ref', Model, Market]` |

`Units Sold` is the wholesale curve; `Units Registered` is the same volume shifted forward by each market's Registration Lag Weeks (retail). The gap between them is the retail pipeline in dealer hands.

---

## 6. Tables (folder `3. Calculations`) — board data sources

| Table | ID | Metrics combined |
|---|---|---|
| **Cohort Trace** | `6923a5c1` | Allocated Units, Slice Ship Date, Slice Arrival Date, Slice Stock Date, Slice Sale Peak Date, Landed Cover |
| **Cover & Allocation** | `3325e817` | Demand Rate, Allocation Share, Cover Snapshot, Landed Cover, Unit Gap |
| **Pipeline Flow** | `e7657451` | Units Shipped, Units Arrived, Units Into Stock, Units Sold |
| **Wholesale vs Registration** | `46deae9e` | Units Sold, Units Registered |

---

## 7. Boards

All full-width; Model preselected to **Civic LHD**.

| Board | ID | Widgets | Notes |
|---|---|---|---|
| **B0 · Landing** | `c5e67b7b` | Pipeline cascade line (`1e7db7dd`) · Wholesale-vs-Registration line (`63ac4670`) | Exec homepage |
| **B1 · Cohort Trace** | `2b09f743` | Cohort journey by market table (`63d5254a`) | Preselect **Civic LHD + Production Week W+6 (WC 2026-09-21)**; filter **Allocated Units > 0** |
| **B2 · Supply & Allocation** | `ebb00ac6` | Cover & allocation table (`9c35eec6`, sorted by Landed Cover asc) · Allocation-share bar (`893bc4d6`) | Gauge bands in guidance text |
| **B3 · Compare** | `4d575407` | Unit-gap-by-model bar (`69ffb65e`) · Landed-cover model × market matrix (`e0e087e8`) | Static, no scenarios |

**Known MCP-surface limitations:** per-cell conditional band *colours* on Landed Cover, live click-path timing, and exported still images require the Pigment UI and were not set programmatically.

---

## 8. Block count summary

| Category | Count |
|---|---|
| Dimensions (business) | 6 |
| Calendar dimensions | 2 |
| Input metrics (assumptions + plan/demand + actuals) | 13 |
| Calculation metrics | 30 |
| Tables | 4 |
| Boards | 4 |
| **Metrics total** | **43** |

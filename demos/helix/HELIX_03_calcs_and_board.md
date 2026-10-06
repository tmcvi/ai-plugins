# HELIX · Step 3 — Calculations & board  [CLAUDE via Pigment MCP · ~30 min]

**Precondition:** Step 2 is done. `Customer` exists with Source System showing 116 / 4 / 3, and
both lists carry `Customer` plus `Close Month` / `Invoice Month`.

**Purpose:** turn the join into a Bookings-to-Billings model and a working board, **`B1 · Bookings
to Billings`**. ERP euros will be sliceable by every CRM attribute, and unmatched keys are surfaced
rather than dropped.

## Operating rules
- Work **only** in `HELIX | Bookings to Billings`. Never wait for input. Keep a decision log.
- Load the `pigment-widget-sizing` skill before any board call.
- Run `validate_formula` before every `create_metric`.
- Put metrics and tables in a Block folder named **`Calculations`**.
- Substitute the real list names if they differ from `TL CRM Opportunities` and
  `TL ERP Invoice Lines`.
- Formats: euro metrics use prefix `€` with 0 decimals. Ratios use multiplier 100, suffix `%` and
  1 decimal.

---

## 3.1 Metrics
All of these are proven formulas from the first build.

**Customer × Month (additive)**

| Metric | Formula |
|---|---|
| `Billings EUR` | `'TL ERP Invoice Lines'.'LineAmount'[BY SUM: 'TL ERP Invoice Lines'.'Customer', 'TL ERP Invoice Lines'.'Invoice Month']` |
| `COGS EUR` | same, on `CostAmount` |
| `Gross Margin EUR` | `'Billings EUR' - 'COGS EUR'` |
| `Bookings Won EUR` | `IF('TL CRM Opportunities'.'stage' = 'Stage'."Closed Won", 'TL CRM Opportunities'.'amount_eur')[BY SUM: 'TL CRM Opportunities'.'Customer', 'TL CRM Opportunities'.'Close Month']` |
| `Open Pipeline EUR` | same, with `stage <> "Closed Won" AND stage <> "Closed Lost"` |
| `Orphan Billings EUR` | `IF('Customer'.'Source System' = 'Source System'."ERP only", 'Billings EUR')` |
| `Won Never Billed EUR` | `IF('Customer'.'Source System' = 'Source System'."CRM only", 'Bookings Won EUR')` |

**Customer only (all-time)**

| Metric | Formula |
|---|---|
| `Billings Total EUR` | `'Billings EUR'[REMOVE SUM: Month]` |
| `Bookings Won Total EUR` | `'Bookings Won EUR'[REMOVE SUM: Month]` |
| `Unbilled Backlog EUR` | `('Bookings Won EUR'[REMOVE SUM: Month] - 'Billings EUR'[REMOVE SUM: Month])[FILTER: CURRENTVALUE > 0]` |
| `Billings Rank` (Integer) | `RANK('Billings EUR'[REMOVE SUM: Month], IF(ISNOTBLANK('Customer'.'Customer Key'), 1), DESC)`. **The second argument is a partition.** A constant partition ranks all customers together. Passing the metric itself there gives every customer rank 1. |

**Segment (the headline join proof)**

| Metric | Dims | Formula |
|---|---|---|
| `Billings by Segment EUR` | Segment × Month | `'Billings EUR'[BY SUM: 'Customer'.'Segment']` |
| `Bookings Won by Segment EUR` | Segment × Month | `'Bookings Won EUR'[BY SUM: 'Customer'.'Segment']` |
| `Coverage % by Segment` | Segment | `'Billings by Segment EUR'[REMOVE SUM: Month] / 'Bookings Won by Segment EUR'[REMOVE SUM: Month]` |

**Ratios and KPIs.** Ratios get their own metrics, never summed across dimensions.

| Metric | Dims | Formula |
|---|---|---|
| `Coverage %` | scalar | `('Billings EUR' - 'Orphan Billings EUR')[REMOVE SUM: Customer, Month] / 'Bookings Won EUR'[REMOVE SUM: Customer, Month]`. Orphans are excluded because they have no booking to cover. |
| `Gross Margin %` | scalar | `'Gross Margin EUR'[REMOVE SUM: Customer, Month] / 'Billings EUR'[REMOVE SUM: Customer, Month]` |
| `GM % by Quarter` | Quarter | `'Gross Margin EUR'[REMOVE SUM: Customer][BY SUM: Month.Quarter] / 'Billings EUR'[REMOVE SUM: Customer][BY SUM: Month.Quarter]` |
| `GM % by Customer Quarter` | Customer × Quarter | `'Gross Margin EUR'[BY SUM: Month.Quarter] / 'Billings EUR'[BY SUM: Month.Quarter]` |
| `GM % by Customer Year` | Customer × Year | same, with `Month.Year` |
| `Billings FY26 YTD EUR` | scalar | `'Billings EUR'[REMOVE SUM: Customer][FILTER: Month.Year = Year."FY 26"][REMOVE SUM: Month]`. Check the Year item name first with `get_list_items`. |
| `Top 10 Concentration %` | scalar | `'Billings EUR'[REMOVE SUM: Month][FILTER: 'Billings Rank' <= 10][REMOVE SUM: Customer] / 'Billings EUR'[REMOVE SUM: Customer, Month]` |

### Sanity values
These are a quick self-check that the formulas are right. If one is off, fix the formula, not the
number.

| Check | Expected |
|---|---|
| Billings EUR, total | 53,862,720 |
| Gross Margin % | 52.8% |
| Bookings Won EUR, total | 70,207,144 |
| Open Pipeline EUR, total | 14,796,882 |
| Coverage % | 75.9% |
| Coverage by segment (Ent / MM / SMB) | 66.1% / 87.6% / 140.2% |
| Billings by segment (Ent / MM / SMB) | 32,111,700 / 15,294,825 / 5,861,675. The three sum to 53,862,720 − 594,520; orphans have no segment. |
| Orphan Billings EUR | 594,520 |
| Won Never Billed EUR | 3,004,352 |
| Billings FY26 YTD | 30.6m (data runs to Sep-26) |
| Top 10 concentration | 46.1% |
| Axiofood GmbH (C10043) GM % by year | 45.6% → 34.4% (FY25 → FY26) |

## 3.2 Tables
A metric view can only show its own metric; adding other metrics is rejected. Multi-metric widgets
therefore need Table blocks.
- **`Bookings to Billings`**: Bookings Won, Billings, COGS, Orphan Billings, Won Never Billed and
  Open Pipeline (all Customer × Month).
- **`Customer Scorecard`**: Billings Rank, Billings Total, Bookings Won Total and Unbilled Backlog
  (all Customer).

## 3.3 Views
Name every view with a `B1 ` prefix. Create views fresh in this session: editing views made
elsewhere forks them into Drafts. Set `showEmptyRows: false` and `showEmptyColumns: false` on all
of them via `update_view_filters`.

| View | Source | Layout |
|---|---|---|
| `B1 KPI Billings FY26 YTD`, `B1 KPI Bookings Won`, `B1 KPI Coverage`, `B1 KPI Unbilled Backlog`, `B1 KPI Orphan Billings` | each metric | KPI: rows `[]`, columns `[]`, `metricsLocation: Columns` |
| `B1 Chart Won vs Billed by Quarter` | Table `Bookings to Billings` | columns = Month grouped by `Quarter`; metrics in Rows; values trimmed to Won + Billings; chart = grouped bar |
| `B1 Chart Billings by Segment` | `Billings by Segment EUR` | rows = Segment, columns = Month grouped by Quarter; stacked bar with totals |
| `B1 Billings by CRM attribute` | `Billings EUR` | rows = Customer grouped by `Segment`; columns = Month grouped by `Year`. **This is the live re-pivot widget.** |
| `B1 Chart GM % Axiofood` | `GM % by Customer Quarter` | rows = Customer (custom display `Name`), filtered `byItems` to C10043; columns = Quarter; line chart |
| `B1 Recon unmatched keys` | Table `Bookings to Billings` | rows = Customer grouped by `Source System`, then Customer; values = Won, Billings, Won Never Billed, Orphan Billings; filter `byItems` IsNotIn [`Both` modality id] **on the grouping pivot** |
| `B1 Top accounts` | Table `Customer Scorecard` | rows = Customer (custom display `Name`); pages = Customer grouped by `Owner` and by `Industry`; add `Billings Total` and `Bookings Won Total` values; filter `byValue` TopN 10 on Billings; sort descending on Billings |

Filtering a dimension-typed property with `byProperty` and a text value fails. Use `byItems` with
the modality id on a grouping pivot instead.

## 3.4 Board `B1 · Bookings to Billings`
Full width, icon `Transaction`, blue. Description: *CRM bookings and ERP billings joined on the
Customer anchor, inside Pigment, with no warehouse or ETL.*

| y | Widgets |
|---|---|
| 0 | Hero text box, Blue_100, h5 w12: H1 "Bookings to billings" plus one line on the two extracts, the anchor formula and the 116 / 4 / 3 split |
| 5 | Band, Blue_80, h2: "Headline numbers" |
| 7 | 5 KPI widgets, h4, widths 3/2/2/3/2, `showTitle: false` |
| 11 | Band, Teal_80: "Bookings convert to billings with a lag" |
| 13 | Won vs billed chart, w7 h14 · Billings by segment chart, w5 h14 |
| 27 | Band, Blue_80: "The join proof: ERP euros sliced by any CRM attribute" |
| 29 | Billings by CRM attribute table, w6 h10 · GM % Axiofood line, w6 h10 |
| 39 | Band, Teal_80: "Reconciliation: unmatched keys are surfaced, not dropped" |
| 41 | Recon table, w6 h12 · Top 10 accounts, w6 h12 |

**Live beat for Tom:** re-pivot the "Billings by CRM attribute" widget from Segment to Owner, then
to Industry. The totals hold under every cut.

## Finish
Print:
1. A one-line summary per sanity value (✓ or the actual number).
2. The board link: `https://pigment.app/w/viridian/application/<appId>/boards/<boardId>`.
3. The decision log.
4. The hand-off line:
   `Read demos/helix/HELIX_04_reporting_frame.md in full and execute it against "HELIX | Bookings to Billings".`

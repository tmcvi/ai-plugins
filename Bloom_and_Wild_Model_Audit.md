# Bloom & Wild — Pigment Model Audit

**Application:** Bloom & Wild (`f2e5071f-3e4b-4cf0-869d-48742f313251`, workspace *viridian*)
**Date:** 16 July 2026
**Scope:** All 81 metrics in the model, classified by role (Input / Calculation / Output) with dimensionality.

---

## Legend & dimensions in play

- **Input** — manual-input; the user sets the value directly.
- **Calculation** — computed intermediate; the engine internals.
- **Output** — final reported result or reconciliation check.
- **Dimensions used:** `Market`, `Brand`, `Month` (time), `Cohort` (a month-subset), `Product category`, `Price bracket`, `Packaging spec`, `Packaging component`, `Fulfilment location`, `Carrier`, `Cost block`.
- *"singleton"* — no structure (a single global scalar).
- 🎯 — hero lever (scenario-editable driver).

**Balance:** 40 Inputs · 27 Calculations · 14 Outputs.

---

## 1) Inputs — 40 metrics (assumptions)

| Metric | Module | Dimensionality | Type |
|---|---|---|---|
| 30-day repeat rate 🎯 | 0. Foundations | `Cohort` | Decimal |
| Order-to-delivery ratio | 0. Foundations | singleton | Decimal |
| Same-day multi-order ratio | 0. Foundations | singleton | Decimal |
| Monthly retention decay | 0. Foundations | singleton | Decimal |
| Quality multiplier floor | 0. Foundations | singleton | Decimal |
| Quality multiplier cap | 0. Foundations | singleton | Decimal |
| Switchover date | Calendar | singleton | Time |
| Acquisition orders 🎯 | 1. Cohort & Revenue | `Cohort` | Integer |
| FY26 base AOV | 1. Cohort & Revenue | singleton | Decimal |
| AOV YoY growth | 1. Cohort & Revenue | singleton | Decimal |
| Bracket AOV | 1. Cohort & Revenue | `Price bracket` | Decimal |
| Bracket mix | 1. Cohort & Revenue | `Price bracket` | Decimal |
| Category mix | 2. Volume & Fulfilment | `Product category` | Decimal |
| Seeded deliveries (monthly avg) | 2. Volume & Fulfilment | `Market`, `Brand` | Decimal |
| Is UK & Bloom & Wild | 2. Volume & Fulfilment | `Market`, `Brand` | Boolean |
| Seasonality index | 2. Volume & Fulfilment | `Month` | Decimal |
| Fulfilment mix | 2. Volume & Fulfilment | `Fulfilment location`, `Product category` | Decimal |
| Category mix (base) | 3. Packaging COGS | `Product category` | Decimal |
| Category unit cost (base) | 3. Packaging COGS | `Product category` | Decimal |
| Component price 🎯 | 3. Packaging COGS | `Packaging component` | Decimal |
| BoM quantity | 3. Packaging COGS | `Packaging component`, `Packaging spec` | Decimal |
| Spec mix | 3. Packaging COGS | `Product category`, `Packaging spec` | Decimal |
| Other packaging adjustments (per delivery) | 3. Packaging COGS | singleton | Decimal |
| Base framework cost | 4. Raw Materials COGS | `Price bracket` | Decimal |
| Bracket mix (RM) | 4. Raw Materials COGS | `Product category`, `Price bracket` | Decimal |
| Average stems | 4. Raw Materials COGS | `Price bracket` | Integer |
| Forex impact 🎯 | 4. Raw Materials COGS | `Month` | Decimal |
| Stems/investment impact | 4. Raw Materials COGS | `Month` | Decimal |
| Flamingo wastage % | 4. Raw Materials COGS | singleton | Decimal |
| Trading waste % | 4. Raw Materials COGS | singleton | Decimal |
| Rounding waste % | 4. Raw Materials COGS | singleton | Decimal |
| Breakage waste % | 4. Raw Materials COGS | singleton | Decimal |
| Waste provision % | 4. Raw Materials COGS | singleton | Decimal |
| Transport (per unit) | 4. Raw Materials COGS | singleton | Decimal |
| Customs (per unit) | 4. Raw Materials COGS | singleton | Decimal |
| Sea freight (per delivery) | 4. Raw Materials COGS | singleton | Decimal |
| RM add-on (per delivery) | 4. Raw Materials COGS | singleton | Decimal |
| Refund (per delivery) | 4. Raw Materials COGS | singleton | Decimal |
| Carrier mix | 5. Delivery COGS | `Carrier` | Decimal |
| Carrier unit cost | 5. Delivery COGS | `Carrier` | Decimal |

---

## 2) Calculations — 27 metrics (the engine)

| Metric | Module | Dimensionality | Computes |
|---|---|---|---|
| Acquisition orders (grid) | 1. Cohort & Revenue | `Cohort`, `Month` | acquisition placed in its cohort month |
| Repeat OPC | 1. Cohort & Revenue | `Cohort`, `Month` | recursive cohort decay curve |
| Repeat orders | 1. Cohort & Revenue | `Cohort`, `Month` | acquisition × repeat OPC |
| Total cohort orders | 1. Cohort & Revenue | `Cohort`, `Month` | acquisition (grid) + repeat |
| Total orders | 1. Cohort & Revenue | `Month` | cohort orders aggregated over `Cohort` |
| Sibling 30-day RR | 1. Cohort & Revenue | `Cohort` | prior-year cohort via `[SELECT: Cohort - 12]` |
| Quality multiplier | 1. Cohort & Revenue | `Cohort` | this RR ÷ sibling RR, floored/capped |
| Top-down AOV | 1. Cohort & Revenue | `Month` | base AOV × YoY growth gate |
| Bottom-up AOV | 1. Cohort & Revenue | `Month` | bracket AOV × bracket mix |
| Total deliveries (UK B&W) | 1. Cohort & Revenue | `Month` | total orders × order-to-delivery ratio |
| Total deliveries | 2. Volume & Fulfilment | `Market`, `Month`, `Brand` | UK cohort result, else seeded × seasonality |
| Deliveries by category | 2. Volume & Fulfilment | `Market`, `Month`, `Brand`, `Product category` | total deliveries × category mix |
| Deliveries by category & fulfilment | 2. Volume & Fulfilment | `Market`, `Month`, `Brand`, `Fulfilment location`, `Product category` | × fulfilment mix |
| Spec unit cost | 3. Packaging COGS | `Packaging spec` | Σ(component price × BoM qty) |
| Category packaging unit cost | 3. Packaging COGS | `Product category` | spec cost weighted by spec mix |
| Blended pkg unit cost (base) | 3. Packaging COGS | singleton | base blended packaging unit cost |
| Blended pkg unit cost (current) | 3. Packaging COGS | singleton | current blended packaging unit cost |
| Blended packaging unit cost | 3. Packaging COGS | `Market`, `Month`, `Brand` | packaging COGS ÷ deliveries |
| Packaging rate impact | 3. Packaging COGS | singleton | price-driven cost decomposition |
| Packaging mix impact | 3. Packaging COGS | singleton | mix-driven cost decomposition |
| Bracket cost | 4. Raw Materials COGS | `Month`, `Price bracket` | framework cost × (1 + forex + stems) |
| Bracket cost by fulfilment | 4. Raw Materials COGS | `Month`, `Fulfilment location`, `Price bracket` | + wastage / transport / customs by source |
| Blended flower unit cost | 4. Raw Materials COGS | `Month`, `Fulfilment location`, `Product category` | bracket cost weighted by RM bracket mix |
| Raw materials base | 4. Raw Materials COGS | `Market`, `Month`, `Brand`, `Product category` | flower unit cost × deliveries (fulfilment removed) |
| Blended flower unit cost (per delivery) | 4. Raw Materials COGS | `Market`, `Month`, `Brand` | RM COGS ÷ deliveries |
| Carrier volume | 5. Delivery COGS | `Month`, `Carrier` | carrier mix × total deliveries |
| Blended carrier rate | 5. Delivery COGS | singleton | carrier unit cost weighted by carrier mix |

---

## 3) Outputs — 14 metrics (reported results + reconciliation)

| Metric | Module | Dimensionality | Computes |
|---|---|---|---|
| AOV (reconciled) | 1. Cohort & Revenue | `Month` | selected AOV feeding revenue |
| AOV gap to close | 1. Cohort & Revenue | `Month` | bottom-up − top-down (reconciliation) |
| Revenue | 6. Gross Margin | `Market`, `Month`, `Brand`, `Product category` | deliveries × AOV |
| Packaging COGS | 3. Packaging COGS | `Market`, `Month`, `Brand`, `Product category` | (unit cost + adj) × deliveries |
| Raw materials COGS | 4. Raw Materials COGS | `Market`, `Month`, `Brand`, `Product category` | RM base + provisions / add-ons |
| Delivery COGS | 5. Delivery COGS | `Market`, `Month`, `Brand`, `Product category` | carrier rate × deliveries |
| COGS by block | 6. Gross Margin | `Market`, `Month`, `Brand`, `Cost block`, `Product category` | the 3 lines pivoted by cost block |
| Total COGS | 6. Gross Margin | `Market`, `Month`, `Brand`, `Product category` | packaging + RM + delivery |
| COGS per delivery | 6. Gross Margin | `Market`, `Month`, `Brand` | total COGS ÷ deliveries |
| **Gross margin** | 6. Gross Margin | `Market`, `Month`, `Brand`, `Product category` | Revenue − Total COGS |
| **Gross margin %** | 6. Gross Margin | `Market`, `Month`, `Brand`, `Product category` | GM ÷ Revenue (category-removed) |
| Check: category vs total | 2. Volume & Fulfilment | `Market`, `Month`, `Brand` | ≈ 0 reconciliation |
| Check: fulfilment vs category | 2. Volume & Fulfilment | `Market`, `Month`, `Brand`, `Product category` | ≈ 0 reconciliation |
| Check: COGS blocks vs total | 7. Audit | `Market`, `Month`, `Brand`, `Product category` | ≈ 0 reconciliation |

---

## Verified headline figures (FY27)

| Metric | Value |
|---|---|
| Revenue | £293.5M |
| Total COGS | £125.2M |
| Gross margin | £168.2M |
| Gross margin % | 57.3% (month-level 56.9% — no aggregation inflation) |
| AOV (reconciled) | £32.28 |

---

## Auditor's observations

- **Consistent P&L grain.** Every reported P&L line (Revenue, all COGS lines, Total COGS, Gross margin, GM%) shares the identical **4-D grain: `Market × Month × Brand × Product category`**, so they add up and slice cleanly. `COGS by block` adds `Cost block` as a 5th axis for the composition view.
- **Cohort engine is 2-D** (`Cohort × Month`) and collapses to `Month` at *Total orders* — the clean hand-off from cohort space into the calendar P&L.
- **Ratio / per-unit metrics** (GM%, COGS per delivery, blended unit costs, AOV, quality multiplier) carry the **Avg aggregators** from the P1 fix. Any *new* ratio metric should get the same treatment, since `Sum` is the default and will otherwise inflate on roll-up.
- **Two dimensions are deliberately narrow:** `Cohort` (a subset of `Month`) drives acquisition / repeat / quality. The sibling lookup relies on the 12-month offset being valid — cohorts in the first 12 months have no prior-year sibling and correctly fall back to a 1.0 multiplier.
- **Reconciliation coverage** is strong on volume (2 checks) and COGS (1 check). There is **no explicit revenue reconciliation** and **no check tying UK cohort deliveries to the blended `Total deliveries`** — candidates to add for full audit closure.
- **Assumption-driven, not hard-coded.** A 40 / 27 / 14 split (Input / Calculation / Output) means the model is driven by editable assumptions rather than baked-in numbers — which is exactly what makes the hero levers demo well.

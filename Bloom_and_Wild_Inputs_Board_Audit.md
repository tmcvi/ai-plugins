# Bloom & Wild — Inputs / Drivers Board-Placement Audit

**Application:** Bloom & Wild (`f2e5071f-3e4b-4cf0-869d-48742f313251`, workspace *viridian*)
**Date:** 16 July 2026
**Question answered:** For every input / assumption / driver, is it presented on a board (so its owner can edit it in the UI), and if so, which board?

---

## Headline

Of **40 input metrics**, only **11 are surfaced on a board**. The other **29 are editable only by opening the block directly in the model tree** — a non-modeller who "owns" the assumption has nowhere in the UI to set it.

- 🎯 = hero lever
- *singleton* = no structure (a single global scalar)

---

## 1) Surfaced on a board (11)

| Input / driver | Dimensionality | Board(s) it appears on |
|---|---|---|
| 30-day repeat rate 🎯 | `Cohort` | Cohort assumptions · Contributor · Hero demo |
| Acquisition orders 🎯 | `Cohort` | Cohort assumptions · Contributor |
| Component price 🎯 | `Packaging component` | Packaging build · Contributor · Hero demo |
| Forex impact 🎯 | `Month` | Raw materials framework · Hero demo |
| Bracket AOV | `Price bracket` | AOV assumptions and reconciliation |
| Bracket mix | `Price bracket` | AOV assumptions and reconciliation |
| BoM quantity | `Packaging component · Packaging spec` | Packaging build |
| Flamingo wastage % | singleton | Raw materials framework |
| Trading waste % | singleton | Raw materials framework |
| Breakage waste % | singleton | Raw materials framework |
| Rounding waste % | singleton | Raw materials framework |

---

## 2) NOT on any board — business drivers someone should own (22)

Editable today only in the model tree. Each row shows the natural board where it should be surfaced.

| Input / driver | Dimensionality | Domain (folder) | Natural home board |
|---|---|---|---|
| FY26 base AOV | singleton | Cohort & Revenue | AOV assumptions |
| AOV YoY growth | singleton | Cohort & Revenue | AOV assumptions |
| Category mix | `Market · Product category` | Volume & Fulfilment | Volume and fulfilment |
| Seeded deliveries (monthly avg) | `Market · Brand` | Volume & Fulfilment | Volume and fulfilment |
| Seasonality index | `Month` | Volume & Fulfilment | Volume and fulfilment |
| Fulfilment mix | `Fulfilment location · Product category` | Volume & Fulfilment | Volume and fulfilment |
| Category mix (base) | `Product category` | Packaging COGS | Packaging build |
| Category unit cost (base) | `Product category` | Packaging COGS | Packaging build |
| Spec mix | `Product category · Packaging spec` | Packaging COGS | Packaging build |
| Other packaging adjustments (per delivery) | singleton | Packaging COGS | Packaging build |
| Base framework cost | `Price bracket` | Raw Materials COGS | Raw materials framework |
| Bracket mix (RM) | `Product category · Price bracket` | Raw Materials COGS | Raw materials framework |
| Average stems | `Price bracket` | Raw Materials COGS | Raw materials framework |
| Stems/investment impact | `Month` | Raw Materials COGS | Raw materials framework |
| Waste provision % | singleton | Raw Materials COGS | Raw materials framework |
| RM add-on (per delivery) | singleton | Raw Materials COGS | Raw materials framework |
| Refund (per delivery) | singleton | Raw Materials COGS | Raw materials framework |
| Sea freight (per delivery) | singleton | Raw Materials COGS | Raw materials framework |
| Customs (per unit) | singleton | Raw Materials COGS | Raw materials framework |
| Transport (per unit) | singleton | Raw Materials COGS | Raw materials framework |
| Carrier mix | `Carrier` | Delivery COGS | *(no delivery board exists)* |
| Carrier unit cost | `Carrier` | Delivery COGS | *(no delivery board exists)* |

---

## 3) NOT on any board — model settings / config, rarely touched (7)

Arguably acceptable off-board, but currently invisible in the UI.

| Input | Dimensionality | Domain |
|---|---|---|
| Order-to-delivery ratio | singleton | Foundations |
| Same-day multi-order ratio | singleton | Foundations |
| Monthly retention decay | singleton | Foundations |
| Quality multiplier floor | singleton | Foundations |
| Quality multiplier cap | singleton | Foundations |
| Is UK & Bloom & Wild | `Market · Brand` | Volume & Fulfilment |
| Switchover date | singleton (Time) | Calendar |

---

## Observations

- **Delivery cost drivers have no home board at all.** Carrier mix and Carrier unit cost live in the model but there is no Delivery board (delivery only appears as an *output* line on COGS summary). Whoever owns carrier rates has nowhere to enter them.
- **Raw materials is the biggest gap.** Only the four wastage %s are surfaced; the 12 substantive RM drivers (framework cost, bracket mix, stems, freight, customs, transport, provisions) are not.
- **Two of the five revenue-critical levers are hidden.** The three hero levers (repeat rate, component price, forex) are well surfaced, but the two AOV levers that drive the entire revenue line — FY26 base AOV and AOV YoY growth — are on no board.
- **Everything unsurfaced still works.** Each driver is wired into the model and computing correctly; it simply cannot be edited from a board by a non-modeller.

---

## Suggested fix

Surface the **22 business drivers** as editable input tables on their natural home boards, and stand up a small **Delivery COGS input board** for the two carrier drivers. Leave the **7 model-settings** items either off-board or grouped on a single collapsed "Model settings" board.

| Board | Input tables to add |
|---|---|
| AOV assumptions and reconciliation | FY26 base AOV · AOV YoY growth |
| Volume and fulfilment | Category mix · Seeded deliveries · Seasonality index · Fulfilment mix |
| Packaging build | Category mix (base) · Category unit cost (base) · Spec mix · Other packaging adjustments |
| Raw materials framework | Base framework cost · Bracket mix (RM) · Average stems · Stems/investment · Waste provision % · RM add-on · Refund · Sea freight · Customs · Transport |
| Delivery COGS *(new board)* | Carrier mix · Carrier unit cost |
| Model settings *(optional new board)* | Order-to-delivery ratio · Same-day multi-order ratio · Monthly retention decay · Quality multiplier floor/cap · Is UK & Bloom & Wild · Switchover date |

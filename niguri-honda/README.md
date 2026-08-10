# Niguri Honda — demo data (Phase 2b)

Seeded, deterministic data generator for the **Niguri Honda** Pigment demo
(Honda MARS 2.0 supplier presentation). Repo-side foundation the build plan
requires committed *before* any Pigment structure is built.

_Illustrative demonstration model — not a solution design._

## Run

```bash
python3 generate.py     # writes data/*.csv and data/QA_REPORT.txt
```

Standard library only, fully deterministic (`SEED = 20260810`).

## Time model

`W0` = the week of the demo anchor **Mon 2026-08-10** on the native Week
calendar (which spans 2026-01-01 → 2027-12-31). Weeks are signed offsets from
W0. Every file carries both the offset column ("W+6") and the Monday
`week_start_date` (the import key onto the native Week calendar). "Production
Week" is the cohort-axis subset of Week.

## Drive-hand model

Model is **drive-hand specific**: 5 base models × {LHD, RHD} = **10 variants**
(`Civic LHD`, `Civic RHD`, …), rolling up to a Base Model parent. Markets carry
a drive hand — **UK + Ireland are RHD, the other 9 are LHD**. A model variant
can only be allocated to markets of its own drive hand (RHD Civics can't sell in
Germany). Each base model's weekly production is split LHD/RHD in proportion to
the demand mass of its drive-hand markets. This makes each cohort a clean
single-drive-hand traceable unit and adds a real conservation/constraint story.

## The consistency engine

Every actuals file is a **view over one simulated slice universe**, so
production → allocation → shipping → registration reconcile through the cohort
chain with no seams. Pipeline:

1. **Volume** — weekly total × base-model mix (CR-V & Civic heavy, Jazz/HR-V
   mid, e:Ny1 small & growing) × month seasonality (Dec dip, summer softening),
   clamped 1,800–2,600/wk; then split by drive hand.
2. **Allocation** — each variant cohort split across its drive-hand markets by
   demand share, **batched** (dominant markets weekly, smaller ones in larger
   staggered shipments). Integer largest-remainder → `Σ slices == cohort units`
   (hard conservation, verified).
3. **Journey** — pure offsets: `ship = prod + prod→ship(base)`,
   `arrival = ship + transit(market)`, `stock = arrival + inbound(market)`,
   `sales = stock + sell-through spread (+2/+3/+4)`. No slice references another.

Frontiers (production firm→W+8, allocation sealed→W+8, shipments→~W+3,
registrations→W-1) emerge from the simulation. A warm-up band (W-45..W-27) is
simulated only to source ~6 months of registration history; not exported in
`production_plan.csv`.

## Files (`data/`)

| File | Grain (one row =) | Rows | Notes |
|---|---|---|---|
| `production_plan.csv` | Model variant × Production Week | 780 | `status` actual/firm/planned |
| `allocation_actuals.csv` | Model variant × Prod Week × Market | 1,106 | sealed cohorts W-26..W+8; batched |
| `floating_shipments.csv` | cohort-slice ship event | 898 | ship_week ≤ ~W+3; `vessel_ref` cosmetic |
| `registrations_actuals.csv` | Model variant × Market × Calendar Week | 1,326 | sales to W-1 |
| `lead_times.csv` | one assumption per row | 60 | 5 prod→ship (by base) · 11 transit · 11 inbound · 33 sell-through |
| `demand_track.csv` | Model variant × Market × Week | 3,978 | dense within matching drive-hand markets |
| `allocation_policy.csv` | Market (+1 global) | 12 | priority, min-%, target cover |

Row counts grew from the plan's pre-drive-hand estimates because the model axis
doubled (10 variants) and Ireland was added — expected, and boards roll up to
Base Model for legibility.

## Calibration decisions

- **Transit compressed** from the plan's North 8–9 / South 10–12 to **North
  4–7 / South 9–12**, preserving north-faster-than-south so the locked hero
  narrative holds: Civic LHD W+6 sells Germany in **November**, Portugal in
  **January**. Portugal held at 12 so the scripted `12 → 10` edit re-phases the
  ribbon (both stay January).
- **Batch phase** pins Spain & Portugal to phase 0 so the hero W+6 cohort
  carries the scripted South-EU January markets.
- **Historical allocation** is demand-share batching (realised mix); the
  cover-gap policy (priority, min-% floors, target cover) is the *forward* L2
  behaviour built in Pigment, fed by `allocation_policy.csv`.

## QA

`data/QA_REPORT.txt` reports row counts, per-cohort conservation, drive-hand
integrity (no cross-drive-hand slices), weekly-total band, and the Civic LHD
W+6 hero trace with the November/January check. Current run: all PASS.

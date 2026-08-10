# Niguri Honda — demo data (Phase 2b)

Seeded, deterministic data generator for the **Niguri Honda** Pigment demo
(Honda MARS 2.0 supplier presentation). This is the repo-side foundation the
build plan requires committed *before* any Pigment structure is built:

> "Commit the data generator and CSVs to the repo before building any Pigment structure against them."

_Illustrative demonstration model — not a solution design._

## Run

```bash
python3 generate.py     # writes data/*.csv and data/QA_REPORT.txt
```

No dependencies beyond the Python 3 standard library. Fully deterministic
(`SEED = 20260810`), so re-running reproduces byte-identical CSVs.

## Time model

`W0` = the week of the demo anchor **Mon 2026-08-10** on the native Week
calendar. Weeks are signed offsets from W0. Every file carries both the offset
column (the demo's language — "W+6") and the Monday `week_start_date` (the clean
import key onto the native Week calendar). `production_week` / `calendar_week`
are the same underlying weeks; "Production Week" is the cohort-axis subset.

## The consistency engine

Every actuals file is a **view over one simulated slice universe**, so
production → allocation → shipping → registration reconcile through the cohort
chain with no seams (the plan's non-negotiable consistency rule). The pipeline:

1. **Volume model** — weekly total × model mix (CR-V & Civic heavy, Jazz/HR-V
   mid, e:Ny1 small & growing) × month seasonality (December dip, summer
   softening). Clamped to 1,800–2,600 units/week.
2. **Allocation** — each cohort (Model × Production Week) split across markets
   by demand share, **batched** (dominant markets weekly; mid/small markets in
   larger, staggered, less-frequent shipments). Integer largest-remainder, so
   `Σ slices == cohort units` exactly (hard conservation).
3. **Journey** — pure offsets on the calendar: `ship = prod + prod→ship(model)`,
   `arrival = ship + transit(market)`, `stock = arrival + inbound(market)`,
   `sales = stock + sell-through spread (+2/+3/+4)`. No slice references another.

The actuals frontiers (production firm to W+8, allocation sealed to W+8,
shipments to ~W+3, registrations to W-1) **emerge** from this simulation rather
than being cut in by hand. A warm-up band of pre-horizon cohorts (W-45..W-27) is
simulated purely to source ~6 months of registration history back to W-26; those
cohorts are not exported in `production_plan.csv` (which stays at the 5 × 78 =
390 grain).

## Files (`data/`)

| File | Grain (one row =) | Rows | Notes |
|---|---|---|---|
| `production_plan.csv` | Model × Production Week | 390 | `status` actual (≤W0) / firm (W+1..W+8) / planned (W+9..W+51) |
| `allocation_actuals.csv` | Model × Prod Week × Market | 1,022 | sealed cohorts W-26..W+8; sparse (batched) |
| `floating_shipments.csv` | cohort-slice ship event | 830 | ship_week ≤ ~W+3; `vessel_ref` cosmetic |
| `registrations_actuals.csv` | Model × Market × Calendar Week | 1,196 | sales to W-1; sparse where a model isn't sold |
| `lead_times.csv` | one assumption per row | 55 | 5 prod→ship · 10 transit · 10 inbound · 30 sell-through |
| `demand_track.csv` | Model × Market × Week | 3,900 | dense; e:Ny1 zero outside EV markets |
| `allocation_policy.csv` | Market (+1 global) | 11 | priority, min-%, target cover |

Column schemas are self-describing headers; see `generate.py` for the authority.

## Calibration decisions

- **Transit lead times are compressed from the plan's note.** The plan's
  realism note is North-EU 8–9 wks / South-EU 10–12. With the hero cohort locked
  at Civic **W+6** and its Germany slice required to *sell in November* and its
  Portugal slice in *January* (the locked click-path), an 8–9-week Germany
  transit is arithmetically impossible — it pushes the November sale into
  late December. So transit is compressed to **North 4–7 / South 9–12 weeks**,
  preserving the load-bearing invariant (north faster than south) and keeping
  **Portugal at 12** so the scripted `12 → 10` edit re-phases the ribbon while
  both stay in January. All lead times are demo-editable assumptions. **This is
  the one deviation from the plan's numbers — flagged for confirmation at
  Checkpoint 2.**
- **Historical allocation is demand-share batching, not the cover-gap policy.**
  Sealed history reflects realised demand mix. The cover-gap ranking policy
  (projected cover, priority-weighted gaps, min-% floors) is the **forward** L2
  behaviour to be built in Pigment; the `allocation_policy.csv` inputs it needs
  are exported here.

## QA

`data/QA_REPORT.txt` (regenerated on every run) reports row counts vs spec,
per-cohort conservation, weekly-total band, the Civic W+6 hero trace with the
November/January narrative check, and the observed frontiers. Current run: all
seven files in band, conservation PASS, narrative OK.

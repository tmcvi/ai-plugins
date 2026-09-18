# Viridian Deal Management — project overview

Pigment application **Viridian Deals** (`f9996e24-0282-4938-9485-93e613ac91d5`),
built inside the existing application, never as a new one.

## What it is for

The Viridian sales team creates and tracks pipeline opportunities. From nine
sales fields the model derives licence value, commission, consulting days and a
day rate; phases the resulting services revenue, days and hours by week from an
S-curve; rolls that up to months; and reconciles the whole picture weekly
against Pigment's own CRM export.

All user-facing experience is delivered through six **Frames**. Boards exist
only as an admin fallback (§7.9 of the brief).

## The six screens

| Frame | What it does |
| --- | --- |
| **Pipeline** | KPI strip, filters, sortable deal table with an inline stage dropdown, and a 480px Deal editor slide-over. |
| **Deals** | The same Deal editor full-page, with a searchable deal picker (Frames take no parameters). |
| **New deal** | The nine-field create form with a live economics preview. |
| **Matching** | Two panes — Viridian deals and Pigment CRM rows — with client-side suggestion scoring, a matched-pairs strip, and "create a Viridian deal from this Pigment row". |
| **Forecast** | Measure and Weighted toggles, stacked monthly bars on canvas, deals-by-period table, Copy table. |
| **Admin** | Every assumption: scalars, per-size economics, commission rates, win rates, S-curve profiles, stage mapping, and the weekly import checklist. |

Frame ids live in `frames/frame-ids.json`; all other Pigment ids in
`docs/pigment-ids.json`.

## How the numbers work

1. **Licence.** `ASM Licence ARR $` by Deal Size, converted at `ASM FX Rate USD
   to GBP`.
2. **Commission.** `ASM Commission Rate %` by Sales Motion applied to the GBP
   licence value, recognised in the close month.
3. **Services.** `ASM Standard Days` by Deal Size × `ASM Standard Day Rate £`,
   each overridable per deal. A blank override always means "use the standard".
4. **Weighting.** `ASM Win Rate %` by Stage gives the weighted forecast beside
   the unweighted one.
5. **Phasing.** The delivery starts `ASM Start Lag Weeks` after the close date
   and runs for `ASM Project Duration Weeks`, spread over `Project Week` W01–W52
   by an S-curve (`tools/scurve.py`, k = 6, rounded to 0.1%, residue on the last
   week). Per-deal override profiles replace the standard entirely.
6. **Hours.** Days × `ASM Hours per Day`.

No number a human might change is written into a formula: every one of them is
an input metric on the Admin screen.

## Repository layout

```text
viridian-deal-management/
├── assets/     the white Viridian logo (see D-note in application-decisions)
├── docs/       pigment-ids.json, metric-ids.json, this overview, data-model,
│               application-decisions
├── frames/     src/ (shared + one file per page), build.py, deploy.py,
│               frame-ids.json
├── tests/      reserved for the §9 test harness
└── tools/      scurve.py (S-curve generator), gen_bindings.py (Frame bindings
                and data sources)
```

`python3 frames/deploy.py` rebuilds every Frame, runs the guard rails
(no network, no storage, no template literals, `node --check`) and writes one
payload per page for the Pigment MCP connector.

## Status

- Phases 0–3 complete; §9 tests T1–T9 pass on the sample deals.
- Phase 4: the sample CRM export is loaded and parsed; the **saved import
  configuration** is the one piece that cannot be created over the API — see
  decision D15.
- Phase 5: all six Frames are deployed and private, awaiting Tom's walkthrough
  before `publish_frame` (D13).
- Phase 6 (P1: kanban, monthly FX, snapshots) not started, by design.

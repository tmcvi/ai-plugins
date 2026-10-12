---
name: nce-reset-demo
description: Restore the NCE Project Financials Pigment model to the agreed demo state (clear test residue, re-seed the demo drivers and overrides, verify every check, write reset-log.md). Use when Tom asks to reset the demo, restore the demo state, clean up after testing, or prepare for a rehearsal or the Nokia session.
---

# nce-reset-demo

Re-runnable procedure for the NCE Project Financials app (Pigment application `cd752192-c735-4506-850f-296af0507b37`). It has three parts — **clear**, **seed**, **verify and log** — and is safe to run any number of times. Tom tests between runs; every run puts the model back to the same agreed state.

Use only the `mcp__Pigment__*` tools (load them with ToolSearch). Never use a lowercase `pigment` MCP server.

## Inputs

- `demo-state.csv` (next to this file, and the editable copy in Project Storage: Google Drive folder `demo` (id `1Ib7IKsboUCxInmsGqcbSOXfDTImQlJeK`, under the project's Downloads folder), file `demo-state.csv`). **Project Storage wins** when the two differ; read it with the Google Drive tools first. Columns: `step, block, coordinates, value, why`. `coordinates` is `Dimension=Item|Dimension=Item`. Steps: `seed` (a metric cell), `log` (a TL · Override log row), `approve` (an INP · Consensus approval row), `context` (a Frame context input).
- `INP · Demo state marker` (`d4210921-8f3f-47f5-8ddc-d5fc4be3a3cd`): ISO date-time of the last clean reset. Blank before the first run, which means everything currently typed is residue.

## Never touch (configuration)

INP · Stage weight %, INP · Consider for stocking, INP · Stage promotion rules, INP · Review threshold, INP · Profile assignment, INP · Profile % library, INP · Phase durations, INP · Delivery lag months, INP · Service costing rule, INP · Payment terms, INP · Current month, INP · Size band threshold, INP · Stale close days, INP · Stock priority rule, INP · Pipeline hardware mix, INP · Account crosswalk, INP · CRM stage crosswalk. If any of them looks wrong, report it — do not change it.

## 1. Clear

Record the count of non-blank cells of each block **before** clearing (it goes in the log). Read with `fetch_metric_data` (break down by every base dimension), clear with `set_metric_input` passing an empty string as the value for each non-blank coordinate.

| Block | id | Clear |
| --- | --- | --- |
| INP · Value override | 6ed796f3-4866-4928-8f7c-e9bd9a63d2f2 | all non-blank (Line, Month, Scenario, Measure) |
| INP · Date override | 3d39558c-57bf-4825-b44f-b41ae4082a41 | all non-blank (Line, Scenario, Date type) |
| INP · Override reason | d343f0a1-71d3-420d-be15-2de8319ba782 | all non-blank (Line, Month, Scenario) |
| INP · Pending edit | d9667942-7cc1-4a19-8ee2-cec2059c2fce | all (Line, Date type) |
| INP · Pending value edit | 8d9a53e2-3ec3-4f3d-af36-23bde5025e82 | all |
| INP · Pending base scenario | 5f44f339-0981-4252-ba90-1c61664f55cc | clear |
| INP · Stock pin | 16cc7b5c-35f2-4c62-be2b-2f53f4fbb336 | all (Demand line, Month, Scenario) |
| INP · PO requested | 577098fc-0776-49d0-9633-c22e013b97ee | all |
| INP · Close override | f90e3d66-86bd-4419-bbff-bd5697dc9be2 | all (Opportunity, Scenario) |
| INP · Validation adjustments | 55c727d4-8204-40ec-b7f9-6eacb1a6cece | all (Line, Month, Scenario, Measure) |
| INP · Validation status | 04a685c3-f248-49e7-99c3-a393909ad000 | all (blank reads Not started) |
| INP · Profile override | 2768ac60-3ec0-4244-936c-50ffad1dfe6e | all (Project) |
| INP · Delivery start override | 089a7771-60d4-4d33-8bfc-ba0829b09ad2 | all (Project) |
| INP · Project override reason | cc97b8ea-160a-4aac-9292-9a55adbfd86a | all (Project) |
| INP · Delay months | f6c44637-3614-4e1c-a7cb-2fd400825012 | **all cells** (Line, Scenario) — re-seeded below |
| INP · Cost uplift % | 951fbcb0-b1aa-4eec-9214-8cd8eb357fe5 | **all cells** |
| INP · Renewal pull-forward | f264a618-649a-4251-b32c-40e5e7fbbb69 | **all cells** |
| INP · Win-rate shift | 6b0463e5-778a-4377-a3ea-8f026a56bdba | **all cells** |
| INP · Pipeline close slip | 5610b4d3-03b4-4d92-a93c-1b6dac5461ac | **all cells** |
| INP · Book delivery slip | 63801cbb-136a-4d40-aba3-6f9061f1b07c | **all cells** |
| INP · Lead-time shock | 946a5303-8ec9-4269-a73e-18eb7d43a4fb | **all cells** |
| INP · Collection days shift | 1766401e-91ce-4df5-9e92-cf94c558334c | **all cells** |
| INP · Event probability | 5476a6c9-d53c-4060-bae6-c0c4fcc315d0 | **all cells** (re-seeded) |
| Frame context: INP · Frame project 5113e882-d51f-447f-8321-30c4661ebeaf, INP · Frame scenario 25f20dd2-6cc8-4a3f-b4c7-df17306de19c, INP · Compare against bc963cdf-13e5-4de8-bbba-363bacdd0f47, INP · Drill measure 96541dfd-06ee-45ae-bdcc-479a58bde516, INP · Drill month ec0ff67b-d789-49c7-ad17-8c8bf4785499, INP · Drill stage group f390f599-541f-41d9-99f3-77bb9b7e4d7f, INP · Drill line 9afa2c8e-9177-4d37-819e-9b79d9fd8f5a, INP · Drill project ba344d4c-daab-4f87-ba41-14a9a9a8b0eb, INP · Filter year 4d34a285-a390-4faa-a8f7-b067d4670cff, INP · Filter stage group 6489eafd-45d3-466c-84ce-c2e0462f105e, INP · Filter customer 83fa21b0-c811-425e-87b9-7c8eed6c025d, INP · Filter product family a74f5781-64fc-475e-9a52-b6242c1e6597, INP · Pipeline owner filter 88872bcf-10f9-4b92-ae69-6cc22f02c6ef, INP · Pipeline close year ded69a58-25fb-493b-b773-2295275544f8, INP · Supply exceptions only cd5afe4c-60f4-43e4-8c82-031d6e6824d3, INP · Supply product ee26933d-47d0-4758-a1ae-e64eaca8f43d | | clear, then the `context` rows of the CSV re-type the landing values |

Lists (read with `fetch_list_data` / `get_list_items`, delete with `delete_list_items`):

- **TL · Override log** (`27d0d1c8-0dba-4be3-a28f-996d17d672e3`): delete rows whose `Logged at` is after the marker (all rows when the marker is blank). Rows at or before the marker are the previous run's demo seed and stay.
- **INP · Consensus approval** (`da8c09d5-0de6-44c8-8f7b-e0b415972b00`): delete rows whose `Approved at` is after the marker (all rows when the marker is blank).

Get the row ids with `get_list_items` (extra properties `Logged at` / `Approved at`) and delete with `delete_list_items`. Both lists' stamps (`Logged at`, `Set by`, `Approved at`, `Approved by`) are Pigment item history: compare them with the marker in UTC.

After clearing, read every block again: each must be empty (the context inputs blank). If anything remains, stop and report — do not seed on top of residue.

## 2. Seed

Apply the CSV in file order:

- `seed`: `set_metric_input` on the block with the coordinates and value (dates ISO, dimension items by display name).
- `log`: `add_list_items` on TL · Override log with the coordinate pairs as columns (friendly names: Line, Month, Scenario, Measure, Date type, Override date, System value, Override value, Reason, Comment; Set by and Logged at are stamped by Pigment and cannot be written). **Skip** the row when a surviving row (at or before the marker) already has the same Line, Month, Scenario and values with a `Demo state (nce-reset-demo)` comment; when the CSV value changed, delete the surviving row and add the new one. Check `System value` against the live system figure (Baseline `CALC · Final value` for the line and month) before writing it.
- `approve`: after the seed has recalculated (read `STG · Bridge` twice a minute apart; use it when the two reads agree), take the Consensus FY 27 Revenue, Gross margin and Cash in (Bridge step = Consensus, Studio KPI = Revenue / Gross margin / Cash in) and add one INP · Consensus approval row with Version, Note, Period and those three figures (Approved by and Approved at are stamped by Pigment). Skip it when a surviving `demo baseline` row already carries the same three figures; otherwise delete that row first.
- `context`: set the Frame context inputs (scalar metrics; dimension items by display name).

## 3. Verify and log

Read, then compare:

0. `list_issues` on the application: **no issues**. A block whose formula is in error keeps its last values silently, so the checks below can read 0 while the block no longer recalculates.
1. `STG · Check value` (`47e46b39-97e3-4b4d-8d08-4ef924889c52`) by Check: every check = 0, except the informational counts (VAL · Delivery date assumed and any other check the build log names as informational), which are recorded, not asserted.
2. `CALC · Pending preview` (`221d0a6d-dd35-42d6-b425-4ac2f9a5b491`): blank everywhere.
3. `STG · Bridge` (`1d2dd004-3c84-4b69-b6d1-c0b5756b4108`): Consensus ≠ System (Baseline) on Revenue **and** Gross margin; System + the four movements = Consensus within £5 on Revenue, Gross margin, Cash in and Net project cash (single-precision rounding on totals of £30m+; anything larger is a real break).
4. `STG · Scenario contents` (`b497a946-3c1b-493f-8f6f-4f7b5d18e907`): Baseline reads "System plan · nothing typed"; Risk, Upside and What-if list their drivers.

If all pass: set `INP · Demo state marker` to the current UTC time (ISO, e.g. `2026-10-12T09:15:00Z`). If any fails: **do not set the marker**; say loudly which check failed and with what value.

Write `reset-log.md` to the Project Storage `demo` folder (id `1Ib7IKsboUCxInmsGqcbSOXfDTImQlJeK`; one new file per run named `reset-log-<UTC date-time>.md`; the Drive connector cannot append to a file): run time, marker before/after, cells cleared per block (before → after), list rows deleted, seed rows applied, every check value, Consensus vs Baseline FY 27 (revenue, gross margin, net project cash, from STG · Bridge), the bridge steps, pass/fail.

## Notes

- Planner overrides go to **Planner override**, drivers only to Risk / Upside / What-if, nothing to Baseline (VAL · Baseline fallback enforces this).
- The demo values are Tom's to change: edit the Project Storage CSV, then run this skill.
- On-screen selections other than the context inputs above (open panels, chips, sort order) live in the browser; a page reload resets them.

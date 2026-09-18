# Data model — Viridian Deals

Application `f9996e24-0282-4938-9485-93e613ac91d5`. Ids for everything named
here are in `docs/pigment-ids.json` and `docs/metric-ids.json`.

## Calendar

Gregorian, Jan 2025 – Dec 2028, weeks starting Monday. Two time dimensions:
**Week** (`9782cd08-…`) and **Month** (`3326b72f-…`). Phasing is computed by
Week and rolled up to Month through the calendar's own hierarchy — a week
belongs to the month it starts in. Day granularity was deliberately not added
(D10).

## Dimensions

| List | Items | Properties |
| --- | --- | --- |
| `Sales Person` | Tom Cvijanovic, Steve Bennett, Callum Maslen, Arkadiusz Hadala | `Email`, `Active`, `CRM Name` |
| `Stage` | Holding pool → Closed Lost, 10 items | `Order`, `Is Open`, `Is Won`, `Is Lost`, `Probability %`, `Pipeline Group` |
| `Use Case` | FP&A, Consolidation, Supply Chain, SPM, Other | `CRM Codes` |
| `Sales Motion` | Sourced, Influenced, Services Only | `Description` |
| `Deal Size` | Small, Medium, Large, Very Large | `Order` |
| `Pigment AE` | seeded from the export | `Active`, `Region` |
| `Pigment Stage` | S0–S5, U1–U3, R1–R3, Closed Won, Closed Lost | `Order`, `Track`, `Maps To Stage` |
| `Partner Attach Type` | the export's attach values | `Maps To Sales Motion` |
| `Project Week` | W01 … W52 | `Offset` |

`Pipeline Group` (Early / Mid / Late / Closed) is what the Forecast Frame
stacks by; the assignment is recorded in decision D4.

## The two record lists

Both `Opportunity` and `Pigment Pipeline` are **Dimension** lists, not
transaction lists. The brief called them transaction lists, but a transaction
list cannot be referenced by a Dimension-typed property and cannot dimension a
Metric, which the match property and every `OPP *` metric need. Decision D1.

### `Opportunity` (`a1e7c76d-…`) — key `Opportunity Name`

`Sales Person`, `Stage`, `Expected Close Date`, `Use Case`, `Sales Motion`,
`Deal Size`, `Pigment AE`, `Notes`, `Matched Pigment Opportunity` (reference to
`Pigment Pipeline`), `Created On`, `Last Updated On`, `Closed On`.

The nine sales fields are the only required ones. Dates are stamped by the
Frames on write, never by hand.

### `Pigment Pipeline` (`0fc2c43e-…`) — key `Pigment Opportunity Name`

`Partner Attach Type`, `Influence %`, `Pigment Stage`, `Create Date`,
`Close Date`, `Delivery Approach`, `Segment`, `Industry`, `Pigment AE`,
`Partner Sales Contact`, `First Seen`, `Last Seen`, `In Latest Load`, plus the
ACV / commission / services columns the current export carries (D6).

Rows that disappear from a later export are never deleted: `In Latest Load`
goes false, so existing matches survive and `ALN Matched Row Dropped` can warn
about it.

## Metrics, by prefix

Seventy-six metrics, all named `PREFIX Name`, money ending `£`, percentages `%`.

- **`ASM` (9)** — the inputs. Everything a human may change: licence ARR, days,
  duration, start lag and the standard profile by Deal Size; the standard day
  rate, hours per day and FX rate as scalars; commission rate by Sales Motion;
  win rate by Stage. Every description starts `INPUT —`.
- **`OPP` (21)** — per-deal economics: licence in both currencies, commission
  rate and amount, win rate, standard / override / effective days and day rate,
  services value standard and revised, the weighted pair, the override and
  status booleans, duration.
- **`PH` (18)** — phasing: effective and override profile %, the calendar week a
  project week lands on, then services revenue, commission, days, hours,
  licence and total revenue by Week, each with a weighted twin, plus the profile
  validity checks and `PH Phased Outside Calendar £`.
- **`PIG` (13)** — import state and the fields parsed out of the opportunity
  name: derived account, use-case codes, close month, deal type, the close-month
  mismatch check, and the load-summary counts.
- **`ALN` (10)** — alignment between a Viridian deal and its matched Pigment
  row: match status both ways, stage gap and alignment, close-date gap in days,
  motion consistency, dropped-row and closed-in-Pigment warnings.
- **`TST` (4)** — assertions used by the §9 tests: profiles sum to 100%,
  profiles are zero beyond their duration, and phasing reconciles to the deal
  value for one deal and for all deals.

## Tables and Views

| Table | View | Shape |
| --- | --- | --- |
| `TBL Opportunity` | `VW Pipeline Grid` | one row per deal, metrics across |
| `TBL Pigment Pipeline` | `VW Pigment Grid` | one row per CRM row, derived + alignment metrics across |
| `TBL Forecast` | `VW Forecast Week`, `VW Forecast Month` | deal × metric down, periods across |
| `TBL Profile by Deal` | `VW Profile by Deal` | Project Week down, paged by deal |
| `TBL Assumptions` | `VW Assumptions` | Deal Size down, assumptions across |
| `TBL Scalar Assumptions` | `VW Scalar Assumptions` | the three scalars |
| `TBL Import Summary` | `VW Import Summary` | one metric per row |
| — | `VW Standard Profiles`, `VW Commission Rates`, `VW Win Rates` | metric views for the Admin tabs |

`VW Forecast Month` pivots Month as a **Grouping on Week**, not as its own
dimension — that is how this calendar exposes it.

## How the Frames read all this

This Pigment instance rejects `View` bindings on Frames (D11), so each Frame
declares List and Metric bindings plus inline **data sources** that reproduce
the Views: `labels` become rows, `selectors` become page selectors and `values`
become columns. The data-source names match the View names the page code
already subscribed to (`vwPipelineGrid`, `vwForecastMonth`, …), so no page code
changed. `tools/gen_bindings.py` generates them and refuses to write on an alias
collision, a duplicate binding or an unresolved data-source reference.

## Boards

Three, in `90 Boards`, native widgets only, fallback and testing only:
`ADM Assumptions`, `ADM Pigment Pipeline`, `TST Opportunity Check`.

# Viridian Deals — application decisions

Decisions taken during the build that deviate from, or fill a gap in, the
*Viridian Deal Management — Pigment Build Brief* (2026-09-18). Working rule 4
of the brief requires each one to be recorded here and raised with Tom.

---

## D1 — `Opportunity` and `Pigment Pipeline` are Dimension lists, not Transaction lists

**Brief:** §4.2 calls both "transaction lists".

**Problem:** Pigment only allows Metrics to be dimensioned by *Dimension* lists.
Creating a Metric over a Transaction list is explicitly unsupported. But the
brief dimensions every `OPP *`, `PH *`, `ALN *` and `PIG *` metric by
`Opportunity` or `Pigment Pipeline`, and §4.2 also makes
`Opportunity.Matched Pigment Opportunity` a dimension property referencing
`Pigment Pipeline` — which a Transaction list cannot back either. Both were
first created as Transaction lists and the property creation failed.

**Decision:** Both are created as Dimension lists. Every property, key and
behaviour in §4.2 is preserved exactly; only the list kind changed.

**Impact:** None on the brief's functionality. Row volumes (tens to low
hundreds) are well within what a Dimension list handles.

---

## D2 — Computed pipeline fields are Metrics, not list properties

**Brief:** §4.2 lists `In Latest Load`, `Derived Account`,
`Derived Use Case Codes` and `Derived Close Month` as properties of
`Pigment Pipeline`. §6.4 then calls the derived three "text **metrics** on
`Pigment Pipeline`", and §6.2 step 4 gives `In Latest Load` a formula.

**Decision:** All four are Metrics, named with the `PIG` prefix required by
§8.2: `PIG In Latest Load`, `PIG Derived Account`,
`PIG Derived Use Case Codes`, `PIG Derived Close Month`. `PIG Derived Deal Type`
(§6.4) and `PIG Close Month Mismatch` follow the same pattern.

**Why:** It resolves the brief's own inconsistency in favour of §6.4, satisfies
the §8.2 naming rule, and keeps every computed value in one place. Views read
Metrics natively, so the Frames are unaffected.

---

## D3 — `TEXTFORMAT` does not exist; close-month mismatch is compared numerically

`PIG Close Month Mismatch` was first written using a date-formatting function
that Pigment's formula language does not have. It now parses the `MM/YYYY`
token and compares month and year as numbers against `Close Date`, which also
avoids any locale or thousand-separator risk in formatting a year.

---

## D4 — Pipeline Group assignment

**Brief:** §4.1 gives `Stage.Pipeline Group` the values Early / Mid / Late /
Closed but does not say which stage maps to which.

**Decision:** Holding pool, First meeting, Qualified → **Early**;
Demo, POC, Scoping → **Mid**; VOC, Contracting → **Late**;
Closed Won, Closed Lost → **Closed**. Editable on the Admin Frame's reference
lists tab.

---

## D5 — Sales Person emails are blank except Tom's

**Brief:** §2 maps each `Sales Person` to a Pigment user through an `Email`
property so the Frames can default the "My deals" filter to the logged-in user.

**Decision:** Only Tom's address is seeded (`tomcv@viridiansolutions.io`,
known from the session). Steve, Callum and Arkadiusz are left blank rather than
guessed from a naming pattern — a wrong address silently breaks their default
filter with no error. The Frames already fall back to a Sales Person selector
defaulting to *All* when the current user cannot be resolved, which is the
documented fallback in §2.

**Action for Tom:** add the three addresses on the Admin Frame.

---

## D6 — The available CRM export does not match the format in §6.1  ⚠️ raise first

**Brief:** §6.1 documents `Opportunity_Data_by_Partner__4_.xlsx` — a *grouped*
report of 45 rows / 38 opportunities, with columns: unnamed column A,
Partner Attach Type, Influence %, Stage, Create Date, Close Date,
Delivery Approach, Segment, Industry, Pigment AE, Partner Sales Contact,
Partner Notes. T10/T11 assert 38 rows, 18 AEs, 9 stages, 5 attach types.

**What is actually in Drive:** that file is not there. The two partner exports
that are — `Opportunity Data by Partner.xlsx` (Mar 2026) and
`Opportunity Data by Partner (15)` (Apr 2026) — are a **later vintage of the
report with a different schema**. The Apr 2026 file is a *flat* table (no group
rows) of **60 opportunities** with columns:

    Opp | Source | NN/Existing | Partner Attach Type | Forecast Category |
    Stage | Create Date | SAO Date | Close Date | ACV (USD) | Commission |
    Services | Industry | Prospecting Segment | AE | Next Steps from SFDC

Differences that matter:

| §6.1 column | Status in the current export |
|---|---|
| unnamed column A | now named `Opp` — still the only key |
| `Influence %` | **gone** |
| `Delivery Approach` | **gone** |
| `Partner Sales Contact` | **gone** — removes the +20 "same contact" signal from the §6.5 match score |
| `Segment` | renamed `Prospecting Segment` |
| `Pigment AE` | renamed `AE` |
| `Partner Notes` | renamed `Next Steps from SFDC` |
| — | **new:** `ACV (USD)`, `Commission`, `Services`, `Source`, `NN/Existing`, `Forecast Category`, `SAO Date` |

New reference values the export carries that §4.1 does not list:
`Partner Attach Type` gains **Deployed** and **Partner Strategy**;
`Pigment Stage` gains **S0 - SQO**. All three have been added
(Deployed → Services Only, Partner Strategy → Influenced, S0 - SQO → Holding pool).
The export contains exactly **18 distinct AEs**, which does match T11.

**Decision:** the `Pigment Pipeline` schema in §4.2 is kept exactly as the brief
specifies — `Influence %`, `Delivery Approach` and `Partner Sales Contact` all
still exist and simply load empty from the current report. Four columns are
added so the new information is not thrown away: `ACV USD`,
`Pigment Commission USD`, `Pigment Services USD` and `Forecast Category`.
Nothing was redesigned around them.

**Why this needs Tom's attention:** the brief's central economic assumption is
that licence value must be *derived* from a Deal Size band because the export
carries no value (§5.2, §10.1). **The current export carries Pigment's own ACV,
commission and services figures per opportunity.** That does not make the
banded model wrong — it is Viridian's own forward estimate and works for
unmatched deals — but for a matched deal there is now a real number to
reconcile against, which is exactly the "alignment with Pigment" the app exists
to provide. Options, for Tom to choose:

1. Keep the banded estimate as-is and show Pigment's ACV beside it as an
   alignment check (**what is built now** — nothing is lost either way).
2. Let a matched deal's licence value fall back to Pigment's ACV when present.
3. Use the band only until matched, then switch.

**Also unresolved by this:** T10/T11's expected counts (38 rows / 9 stages /
5 attach types) describe the older file and cannot pass against the current
one. The 18-AE figure does hold.

---

## D7 — Sample CRM data loaded from the real Apr 2026 export

§8 Phase 4 asks Claude Code to convert the sample export once for testing.
All 60 rows of the Apr 2026 export are loaded into `Pigment Pipeline` with
`First Seen` = `Last Seen` = 2026-04-15 (the file's own date, so the Frame
header reports the load honestly).

`Partner Notes` was **not** loaded. The column exists and Tom's weekly native
import will populate it; it was left out of this one-off seed because the
free-text SFDC notes are long and add nothing to the tests.

---

## D8 — `Pigment Stage` R1 and R2 are deliberately unmapped

§10.11 gives stage mapping defaults for S1–S5, U1–U3 and R3 but says nothing
about R1 and R2. Both are created with `Maps To Stage` blank, which is the
correct starting state: they surface in `PIG Unmapped Stages` as an Admin
to-do, exercising the §6.2 step 5 workflow.

---

## D9 — Extra `TST` and `PIG` metrics beyond the brief

The brief names `TST Profile Sums` (T1) and `TST Phasing Reconciles` (T9).
Added alongside them: `TST Profile Zero Beyond Duration` (the second half of
T1, which the brief states but does not name a metric for) and
`TST Phasing Reconciles All` (a single scalar roll-up so the check is one cell
to watch). `PIG Rows Total`, `PIG Rows In Latest Load`, `PIG Rows Dropped` and
`PIG Unmapped Stages` were added to supply the §6.2 step 5 import summary.

---

## D10 — Calendar dimensions are Week and Month only

§4.3 specifies Week and Month. Quarter and Year were **not** added, so the
"close quarter" filter on the Pipeline Frame (§7.4) and the Forecast date-range
filter are computed client-side from the close date. Say the word if a native
Quarter dimension would be more useful for Board reporting later.

---

## D11 — Frames bind Metrics and data sources, not Views  ⚠️ differs from the skill

**Brief / skill:** §7.5 lists a `View` binding per Frame, and the
`building-pigment-frames` skill documents `subscribeToVizualization` over
**View** bindings.

**What this Pigment instance actually does:** `create_frame` rejects them
outright —

    Frame bindings with type View are not supported

**Decision:** the Frames bind **Lists and Metrics**, and each former View is
re-expressed as an inline **`dataSource`**: `labels` are the dimensions that
become rows, `selectors` are the page-selector dimensions, and `values` are the
metrics that become columns. That is the same row/column shape the Views
produced, so **no page code changed** — each data source is deliberately named
with the alias the page already subscribes to (`vwPipelineGrid`,
`vwAssumptions`, and so on), which keeps the brief's §7.5 vocabulary intact.

Verified against the live API: a probe Frame carrying the full Admin binding set
(27 bindings, 6 data sources) was accepted, then deleted.

The Views built in Phase 3 are **not** wasted — they remain the human-facing
read surface in Pigment itself and back the §7.9 Boards. `frames/src/bindings.json`
and `frames/src/datasources.json` are generated together so the two stay in step.

**Still to verify in a browser:** the exact runtime shape a multi-label data
source returns (`vwForecastMonth` uses `labels: [opportunity, month]`). The
Forecast Frame expects deals down and periods across; if the SDK returns both
labels nested on rows instead, that page needs a small reshape in
`rowsFor()` / `periods()`. Every other data source is single-label and
unambiguous.

---

## D12 — Live Frame bodies are compact builds of the same source

`frames/src/` is the source of truth and `frames/build.py` is the reproducible
build. The bodies actually sent to `create_frame` are **compact, per-page
variants** of that build: identical logic, with the comments and the shared
helpers a given page never calls left out, so each body stays well inside a
comfortable payload size.

They are functionally equivalent, not byte-identical to `frames/dist/*.js`.
Re-running `python3 frames/deploy.py` and sending the resulting payload through
`update_frame` replaces a live body with the full commented build and brings the
two into exact sync. Nothing was ever edited in the Pigment Frame editor, per
§7.7.

**Status, 18 Sep.** The three Frames deployed later — **Deals**, **Matching**
and **Forecast** — carry the *full* `frames/dist/*.js` build, byte for byte, so
only **New deal**, **Admin** and **Pipeline** are still on compact bodies.
Re-sending their payloads through `update_frame` brings all six into sync.

---

## D13 — All six Frames are deployed but unpublished

Every Frame in §7.4 is live in the Viridian Deals application and recorded in
`frames/frame-ids.json`:

| Frame     | Id                                     |
|-----------|----------------------------------------|
| Pipeline  | `c211afb6-043f-42ac-a3b1-9a896758b4b0` |
| Deals     | `6f71fd39-ccd4-4fc0-a9fb-a377aad2bb0e` |
| New deal  | `b5a8c2e4-93ff-4afc-8d88-36e3515a736e` |
| Matching  | `b4710c66-abf2-414d-a1de-b105ea16f5c6` |
| Forecast  | `f58643ec-c5a5-44e3-b34a-d087ddc30555` |
| Admin     | `3fcfcea9-feba-4b4e-9b0c-4b7ec3b41849` |

They are all `isPrivate: true` — visible to the builder, not yet to the sales
team. `publish_frame` is deliberately left until Tom has walked each screen,
because publishing is what puts them in front of users. The brief gives no
instruction either way (§7.7 covers editing, not publishing), so the safer
order was chosen: review first, publish second.

---

## D14 — The three fallback Boards, and why they are plain

§7.9 asks for `ADM Assumptions`, `ADM Pigment Pipeline` and `TST Opportunity
Check` as a safety net. All three are built in the `90 Boards` folder with
native widgets only — no attempt to restyle them in the brand, because they are
not the product and a half-branded Board invites people to use it as one:

| Board | Id | Contents |
| --- | --- | --- |
| ADM Assumptions | `844cf295-0965-49eb-bfe5-fd4c054d9e97` | scalars, assumptions by size, commission rates, win rates, standard profiles |
| ADM Pigment Pipeline | `09dd0f23-2935-4c81-b098-02b06cdba535` | import summary beside the imported rows |
| TST Opportunity Check | `c7c18fc2-d47f-4e2d-a0ce-95d6ff8ac5f4` | `VW Pipeline Grid` beside `VW Forecast Month` |

Each carries a one-paragraph note saying what it is for, so nobody mistakes the
fallback for the application.

---

## D15 — ⚠️ The saved import configuration has to be made in the Pigment UI

Phase 4 asks for a *saved import configuration* for Tom's weekly CSV. The
Pigment MCP connector has no tool that creates one: it can add and update list
items (which is how the sample export was loaded) and it can point an
Import **action button** at a `configurationId`, but the configuration itself —
the file-to-property column mapping Pigment stores — can only be created by
a person in the import dialog.

So this one deliverable is left for Tom. Everything it needs is in place: the
`Pigment Pipeline` properties are named exactly as the export's column headers
so the mapping is 1:1, the stage and attach-type lists auto-create unknown
values, and the Admin Frame's Import tab carries the weekly checklist. Once the
configuration exists, its id can be dropped into an Import action button on
`ADM Pigment Pipeline` to give the import operator a one-click run.

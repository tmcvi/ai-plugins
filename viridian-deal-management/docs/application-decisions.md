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

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

---

## D16 — ⚠️ `subscribeToVizualization` is gone; the SDK call is resolved at runtime

Every Frame failed with *"The subscribeToVizualization operation is no longer
supported. Use useSubscribeToDataSource instead."* The rename is the other half
of the change behind D11: Frames stopped binding Views and started declaring
data sources, and the subscription was renamed to match. The
`building-pigment-frames` skill in this environment still documents the old
name, so the brief's §7.1 constraints are out of date on this point.

Rather than pin the new name, `frames/src/shared/sdk.js` now resolves whichever
the workspace exposes — `useSubscribeToDataSource`, `subscribeToDataSource` or
`subscribeToVizualization` — and the same for `subscribeToItems`. A build that
has none of them reports the SDK's actual method list in the error, so the next
rename is one message to diagnose rather than a guess.

Two related defences came with it: a subscription is torn down through
`stopSub()`, which accepts either an object with `unsubscribe()` or a bare
unsubscribe function; and the Deal editor only calls
`updatePageDefinitions()` when the subscription offers it, otherwise it drops
the subscription and takes a fresh one for the newly selected deal.

**Still unverified:** whether the new call keeps the `(alias, { onData, onError,
pageDefinitions })` shape and returns the same `{ labels, cells }` payload. If
it does, the rename is the whole fix. If it does not, the Frames will sit on
"Loading" instead of erroring, and the payload shape is the next thing to
change.

**Deployment note.** Deals, Matching and Forecast took the full patch. Pipeline,
Admin and New deal are still on the compact bodies (D12), so they took a
narrower edit — the call expression is swapped in place, without the diagnostic
message. They are due a full re-deploy from `frames/dist` to bring every Frame
back to one source.

## D17 — ⚠️ The data-source contract, established by probe rather than by documentation

Frames no longer read a View. A Frame declares inline **data sources** and
subscribes to them by name, and the rules below were all found by deploying a
throwaway probe Frame and reading what came back, because no documentation for
them exists (see D19).

1. **Frame bindings of type `View` are not supported.** A data source is built
   from `List`, `ListProperty` and `Metric` bindings instead.
2. **Labels and selectors must target a dimension shared by every value in the
   source.** Month is a property of Week, not a dimension of the PH metrics, so
   the forecast could not be labelled by month. It subscribes weekly and rolls
   up to months client-side in `pages/forecast.js`.
3. **A `ListProperty` binding needs the slugged technical name**, not the
   friendly one — `stage_T28KCI`, not `Stage`. `tool:get_list_items` returns them.
4. **Item subscriptions return names only.** Anything else a screen shows about
   a list item has to come from a data source over its properties, which is why
   `vwStageProps`, `vwUseCaseProps` and friends exist.
5. **The payload is row-major and carries no column labels:**
   `{ rows: [ { labels: [...], values: [...] } ], rowOffset, totalRowCount }`.
   Values arrive in the order the source declares them, so `DS_COLUMNS` —
   generated by `gen_bindings.py`, injected by `build.py` — is what names them.
   `adaptGrid()` converts this to the column-major grid the pages read.

## D18 — ⚠️ One value type per data source

Pigment rejects a source whose values span more than one type:
*"A data source cannot mix several value types."* Every logical source is
therefore emitted as one physical source per type — `__Decimal`, `__Integer`,
`__Boolean`, `__Text`, `__Date`, `__Dimension` — and `mergeParts()` joins them
back into a single grid on the row labels before any page sees them. A page
still subscribes to the logical name; `DS_PARTS` maps it to its parts.

Aggregators follow from the same split: `Sum` for Decimal and Integer, `First`
for everything else, since summing a date or a dimension is meaningless.

## D19 — ⚠️ The Frames skill is a generation behind the deployed API

`building-pigment-frames/SKILL.md` was read before this build started and
re-read in full afterwards. It documents the previous Frames API throughout, so
following it produces a Frame that cannot run in this workspace:

| The skill says | The workspace does |
|---|---|
| `subscribeToVizualization` | throws; `subscribeToDataSource` |
| `View` bindings with `view_id` | View bindings rejected outright |
| `pageDefinitions` / `updatePageDefinitions` | not offered on the subscription |
| Column-major `cells[c][r]` | row-major `rows[].values[]` |
| snake_case (`list_id`, `can_read`) | camelCase (`listId`, `canRead`) |
| `create_frame`/`update_frame` take `name, body, bindings` | also require `dataSources`, and `id` **inside** the request |
| `find_frame_by_name`, `list_frames`, `find_frame_by_id` | only `search_frames` exists |

Guidance in it that does still hold was kept and is worth naming, because it is
the part worth trusting: the IIFE and `root.__cleanup()` shape, the
`isReady()` loading guard, fixed-inset layout, HiDPI canvas scaling, debounced
renders, tooltips parented to `document.body`, and the leak-prevention rules.
Re-reading it caught one piece of that guidance the build had missed — the host
sizes a Frame with an AutoSizer, so a `window.resize` listener alone is not
enough. `onViewportResize()` now wires a `ResizeObserver` on
`document.documentElement` as well.

**For Tom:** the skill needs updating against the current API, and until it is,
anyone starting a Frame from it will lose the same day this build lost.

## D20 — Frames are verified locally, because Pigment cannot be reached from the build environment

`app.pigment.com` is denied by the build container's egress policy, and the
board is behind SSO in any case, so there is no way to open the app from where
it is built. Every fix was therefore going through Tom, one error message per
round trip.

`frames/harness/` closes that loop. It runs the real bundles from `frames/dist`
in headless Chromium against a mock `PigmentSDK` that replays the D17 contract,
screenshots each screen, drives the Admin tabs, and fails on any console error,
error screen or stuck loading block. It found three defects that had shipped:
the `display:block` label style stacking every table header, Admin reading the
scalar assumptions by row label when D18 turned them into columns, and the New
deal preview painting from an empty selection.

What it cannot check is anything Pigment itself adjudicates — whether a data
source is accepted, and whether the numbers are right. For that the Frames now
self-report: if a source has failed or never answered eight seconds in, the
page replaces itself with a table of every source and its outcome.

## D21 — ⚠️ Writes address a property through its binding, not by friendly name

*"Referencing properties by friendly name in addItem/editItem is no longer
supported. Reference properties through their bindings instead."*

This is the same API generation as D16–D19, and it broke every write in the
app: the Deal editor, Pipeline's inline stage dropdown, Matching's link and
unlink, New deal's create, and the three Admin mapping tables.

`SDK.editItem('opportunity', name, { 'Sales Person': 'Alex Reid' })` is now
`SDK.editItem('opportunity', name, { oppSalesPerson: 'Alex Reid' })`, where
`oppSalesPerson` is a `ListProperty` binding on the Frame with `canWrite: true`.

The pages still speak in friendly names — that is what the model calls these
fields, and it keeps the page code readable against the data model. The
translation happens once, in `bindProps()` inside the shared write wrappers,
against `WRITE_PROPS`: a per-page map of list alias → friendly name → binding
alias, emitted by `gen_bindings.py` and injected by `build.py`. A property a
page writes now gets a writable binding whether or not the page also reads it,
and a write with no binding behind it is recorded in the data source report
(D20) rather than failing silently.

One new binding was needed: the Opportunity display property
(`opportunity_name_POPNJR`), which `addItem` sets when New deal creates a deal
and `editItem` sets when the editor renames one.

**Cost of this one:** bindings changed, and bindings can only be replaced
wholesale, so Pipeline, Deals, New deal, Matching and Admin each need a full
`update_frame` rather than a patch. Forecast writes nothing and needs only its
body updating.

## D22 — The Frame deploy path mangles `\uXXXX` and counts bytes, so every deploy is now checksummed

Deploying Pipeline with the D21 bindings surfaced three things about
`update_frame` / `update_frame_body` that nothing documents, and that between
them had already put a broken body on the Frame.

**1. The body arrives having been unescaped twice.** A `£` written into
the Frame source — which is what `json.dumps` emits for `£` in the generated
`COL_ALIAS` and `DS_COLUMNS` maps — is decoded by the server into a literal
`£` before it is stored. The same happens to any `\uXXXX`; control characters
(`\u0001`, used as the label separator in `mergeParts`) are left alone. For
this app it is harmless, because `"OPP Licence Value £"` and
`"OPP Licence Value £"` are the same JavaScript string — but it means the
stored body is *not* byte-identical to `dist/*.js`, and any later
`update_frame_body` patch has to target the decoded form.

**2. `bodySizeBytes` is UTF-8 bytes, not characters.** Every `£` in the body
counts twice, every `·`, `×`, `▲`, `▼` twice or three times. Read as a
character count it looks like the deploy lost data when it had not.

**3. A deploy is a hand-copied transcript, and transcripts lose things.**
Pigment is unreachable from this environment, so the body cannot be POSTed from
the file — it is carried across in the tool call. Two defects got through that
way on this deploy: a blank line dropped because the terminal trimmed a leading
blank from a `sed` range, and — far worse — the closing `})();` of the
top-level IIFE, dropped because the last line of the file sat one line past the
end of the range that was read. That second one is a syntax error: the Frame
would not have run at all.

**So the deploy is now checksummed.** The body goes up in ≤17,000-character
chunks, and after each chunk the returned `bodySizeBytes` is compared against
the expected UTF-8 byte length of that slice of `dist/<page>.js` with
`£` → `£` applied. A chunk that does not match is wrong and is found
before the next one goes up. At the end the whole body is checked the same way,
and `update_frame_body` is used a second time as a read-only verifier: an edit
whose `newString` equals its `oldString` changes nothing but fails unless the
text is present exactly once, and `occurrencesReplaced` on single characters
(`\n`, `(`, `)`, `{`, `}`, `;`, `'`, `"`) gives a cheap structural checksum.

Pipeline deployed on 1 October 2026 verifies at 91,814 bytes against an
expected 91,814, with all nine character counts matching.

## D23 — ⚠️ A data source draws on one kind of value, and a Frame holds about thirteen

The Pipeline Frame's own data source report (D20) named two failures Pigment
had until then been giving as a single unexplained error screen. Both are
limits on the inline data sources D17 moved the app onto, and between them they
undo part of D18.

**A source cannot mix a list property with a metric.** Pigment says "A data
source cannot mix several value types", but the message is misleading: the
three sources it rejected were the three that mixed kinds, and every source
drawing on one kind alone was accepted, whatever its type.

| source | values | result |
| --- | --- | --- |
| `vwPipelineGrid__Date` | 4 list properties | ok |
| `vwPigmentGrid__Date` | 4 list properties **+ 1 metric** | rejected |
| `vwPipelineGrid__Decimal` | 16 metrics | ok |
| `vwPigmentGrid__Decimal` | 2 list properties | ok |
| `vwPipelineGrid__Text` | 1 list property **+ 2 metrics** | rejected |
| `vwPigmentGrid__Text` | 4 list properties **+ 5 metrics** | rejected |

So the split is now by value type *and* source kind: `vwPipelineGrid__TextP`
carries Notes, `vwPipelineGrid__TextM` carries the two ALN metrics. Part names
gain a `P` or `M` suffix, which also makes the diagnostics table legible.

**And a Frame gets about thirteen data sources at once.** The fourteenth comes
back "Too many active subscriptions for this resource", and on Pipeline the
first thirteen were served while the remaining seven were refused outright —
the import summary, both stage property sources and the deal size order, so the
page lost its header date and every dropdown's sort order. Item subscriptions
are a separate pool; all four of those succeeded.

This is D18 colliding with a hard limit: splitting by type (now by kind too)
turned Pipeline's seven logical sources into twenty-five parts, and Admin's
thirteen into twenty-one.

**Nothing is held open any more.** A source is read and its subscription
dropped as soon as it has answered, with a budget of six in flight at a time,
so a page's peak is six however many parts it needs. Where the page writes, the
source is re-read after the write rather than kept live — debounced at half a
second, so a burst of edits costs one re-read, and late enough that Pigment has
recalculated rather than racing it. `gen_bindings.py` works out which sources
those are per page (any source carrying a binding the page can write) and emits
`DS_LIVE`; the alternative, holding the written sources live, would have
deadlocked Admin, whose twelve live parts exceed any budget safely under the
cap.

The cost is that a Frame no longer sees another user's edit until something
makes it re-read. For a six-person sales team that is the right trade against
not loading at all, but it is a behaviour change worth knowing about.

## D24 — ⚠️ The partner export has changed schema again, and the Oct 2026 file is mostly history

The `2026-10-07_Partner_Opportunities` export is a **third** schema, different
from both §6.1 and the Apr 2026 file D6 describes. It is closer to the brief
than April was: `Influence %`, `Delivery Approach` and `Partner Sales Contact`
are all back, so the §6.5 match score gets its "same contact" signal again.
`Company` and `Opportunity ID` are new; April's `Commission`, `Services`,
`Forecast Category`, `Source`, `NN/Existing` and `SAO Date` are gone, which
leaves `Pigment Commission USD`, `Pigment Services USD` and `Forecast Category`
with nothing feeding them.

**The file is mostly closed business.** 172 of its 244 rows sit on a stage the
model had never seen, and 171 of those are already won or lost; 173 rows have a
close date in the past, the earliest Feb 2024. Only ~72 rows are live pipeline.
Tom chose to load all 244 with the stages mapped, rather than filter to open
rows, so the history is visibly closed instead of invisible. Six stages were
added: `S8 - Close win`, `U4 - Closed Won` and `R4 - Closed Won` → Closed Won;
`S9 - Dead lost` and `U5 - Dead Lost` → Closed Lost; `U0 - Identified` →
Holding pool. (D8's R1/R2 stay deliberately unmapped.)

**`Partner Sales Contact` pointed at the Viridian `Sales Person` list** — the
list behind the sales-person dropdown on every Viridian deal. The export names
Pigment-side people, and carries Tom as both "Thomas Cvijanovic" (63 rows) and
"Tom Cvijanovic" (46), so importing it would have put a duplicate of him and
two Pigment staff into the Viridian team picker. The property now references a
new `Partner Contact` dimension instead, and `tools/prep_pigment_import.py`
folds the spellings together. The technical name did not change, so no Frame
binding moved. The match score compares display names, so it still works.

**The opportunity name is a fragile key, and this file proves it.** Asda was
`Asda -  - 10/2026 - Viridian - UK (Partner) Sourced` in April and is
`Asda - [FPA] - …` now: keyed on the name, a rename is a new row plus a dropped
one. `Opportunity ID` would be stable but is filled on only 47 of 244 rows, so
it cannot be the key yet. Worth revisiting when Pigment populates it.

**The derived-name metrics are now unreliable.** Three naming conventions
appear in one file — 100 rows use `[FPA]`, 95 use ` - FP&A - `, 49 use neither
— and only 83 carry a trailing close month. `PIG Derived Account`,
`PIG Derived Use Case Codes`, `PIG Derived Close Month` and
`PIG Close Month Mismatch` all parse that name, so they are wrong or blank for
most rows. A `Company` property has been added and is loaded directly from the
export, which removes the need to parse the account at least.

**Correction to D15:** it claimed the properties were "named exactly as the
export's column headers so the mapping is 1:1". That was never true of the
April file and is not true of this one. `prep_pigment_import.py` now makes it
true by renaming the headers on the way through, so the claim holds for the
file the operator actually imports.

**Still outstanding — `First Seen` after the first load.** `PIG First Seen Calc`
is `IFBLANK(First Seen, Last Seen)` and its description says it is "copied back
onto the First Seen property after each load", but nothing does that copying.
On a fresh list it is harmless: every row is genuinely first seen today. From
the second load on, `First Seen` stays blank and the metric just tracks
`Last Seen`, so "new this week" would be meaningless. The fix is a one-click
"Stamp First Seen" action on the Admin Import tab, writing the metric back onto
the property for rows where it is blank — not yet built.

## D25 — Item history replaces the hand-stamped dates, and the Frames stop writing them

Tom replaced the manual `Created On` / `Last Updated On` properties on
`Opportunity` with Pigment's native item-history properties, `Created at` and
`Last edited at` (plus `Created by` / `Last edited by`). This is the better
mechanism and it removes a class of bug: the Frames were stamping those dates
on every write, so a save that failed halfway, or any edit made outside a
Frame, left them lying.

It does mean the Frames had to change, because an item-history property is
read-only. Every write path stamped `Last Updated On`, and New deal stamped
`Created On` as well — the Deal editor's save, rename, stage dropdown and close
dialog; Pipeline's inline stage change; Matching's link, unlink and
create-from-Pigment. Each of those would have failed outright against a
property that no longer accepts writes. All the stamping is gone; the two
bindings remain, read-only, so the editor footer still shows when a deal was
created and last touched.

Two knock-ons worth noting:

* The properties are **Text**, not Date. They move from the `__DateP` part of
  `vwPipelineGrid` to `__TextP`, and the footer renders them through a new
  `stamp()` helper that formats an ISO-looking value as a date and otherwise
  shows Pigment's own text rather than a dash.
* `Closed On` is **not** an item-history property and stays exactly as it was:
  it means the date the deal was marked won or lost, which is a business fact
  the Frames do set, not a record of when the row was touched.

**The same move does not work for `Last Seen` on `Pigment Pipeline`.**
`First Seen` maps cleanly onto `Created at` — the row's creation really is the
first time we saw that opportunity. `Last Seen` is a different question: *was
this row in the latest file?* `Last edited at` only advances when a value
actually changes, so a row that comes back unchanged week after week would stop
looking current and `PIG In Latest Load` would report it as dropped — a warning
on a healthy matched deal, which is the one thing drop-detection must not get
wrong. It is also Text, so `PIG Latest Load Date` cannot take a MAX of it.
`Last Seen` therefore needs to stay a Date fed from the import file, which is
why `prep_pigment_import.py` stamps it.

## D26 — `First Seen` and `Last Seen` are derived from Pigment's item history

Tom replaced the hand-maintained `First Seen` / `Last Seen` properties on
`Pigment Pipeline` with Pigment's native item-history stamps. Those arrive as
**Text** — `2026-10-07T08:29:15.358+00:00` — which nothing in the model could
consume: `PIG Latest Load Date` takes a MAX and needs a Date, and a text
timestamp cannot be rolled up by day, week or month.

So both are now **Date properties computed from the history stamps**:

    First Seen  = DATEVALUE(LEFT('Pigment Pipeline'.'Created at', 10),     "yyyy-MM-dd")
    Last Seen   = DATEVALUE(LEFT('Pigment Pipeline'.'Last edited at', 10), "yyyy-MM-dd")

Taking the first ten characters discards the time of day, which is an accident
of when the import happened to run, and leaves a clean Date that Pigment's time
dimensions can group — the day → week → month analysis of when pipeline was
created that Tom wants next.

Being formula properties, they are also **read-only**, which is the real prize:
no import can overwrite them and no Frame can stamp them wrong. The weekly file
no longer needs a `Last Seen` column at all.

Three metrics had to be re-pointed by hand. Recreating a property gives it a
new technical name, so `PIG Latest Load Date`, `PIG In Latest Load` and
`PIG First Seen Calc` stayed in formula error until each formula was re-applied
— re-saving the same text is enough to rebind it. `PIG First Seen Calc`
collapses to `'Pigment Pipeline'.'First Seen'`: it existed only to reconstruct a
first-sighting date that nothing maintained, and Pigment maintains it now. It is
kept rather than deleted so the Frames' binding does not move.

**The one risk this carries, stated plainly.** `Last edited at` only advances
when a value actually changes. A row that re-imports completely unchanged may
keep last week's stamp, fall behind `PIG Latest Load Date` and be reported as
dropped from Pigment's pipeline when it is sitting in the file. That would put a
"dropped" warning on a healthy matched deal. The alternative — a `Last Seen`
column stamped by `prep_pigment_import.py` — had no such ambiguity, and this
was raised before the change; Tom chose the native fields. Worth watching on the
second load: if `PIG Rows Dropped` comes back non-zero while the file plainly
still carries those rows, this is why.

First load verified: `PIG Latest Load Date` 2026-10-07, 244 of 244 rows in the
latest load, none dropped.

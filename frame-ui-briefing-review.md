# Frame UI Briefing — Review Notes

Review of **Clinical Trials Pricing Application — Frame UI Briefing** (2026-09-20, @Tom)
against `clinical-trials-pricing-architecture.md` (the 20 Sep read-only extract) and the
`building-pigment-frames` SDK reference.

**Verdict.** Strong brief. The scoping logic — Frame the chart/status screens, leave the
editable pivots native — is right, the bindings are mostly accurate against the extract,
and §9 is faithful to the SDK. Nine things need changing before step 1. Three of them are
blocking.

| | Item | Severity |
|---|---|---|
| 1 | F1 is incomplete; step 0's exit criterion can't be met as written | **Blocking** |
| 2 | Frame 2 has no read path for `Start Date` | **Blocking** |
| 3 | §5/§6/§7 binding tables contradict §8 | Edit |
| 4 | Two undocumented SDK assumptions to prototype before step 1 | **Blocking** |
| 5 | Options in or out of the budget? | Decision |
| 6 | F4 is load-bearing, not polish | Reclassify |
| 7 | Reconciliation anchor should be Project 4 (v1), not Project 1 (v2) | Edit |
| 8 | Two open decisions settleable from the model | Answered below |
| 9 | Smaller corrections | Edits |

---

## 1. F1 is incomplete — and step 0's exit criterion can't be met as written

F1 covers Defects 1 and 2 from the extract (the 800%, and `Milestone Amount` multiplying
whole-project revenue by a per-stage %). It omits the third, which lives in a different
metric:

```
Phased Earnt Revenue = (…) * IFDEFINED(Milestone_Period, 1)
```

`Milestone_Period` is a PRORATA **fraction**; `IFDEFINED(…, 1)` turns it into a **flag**.
At every phase boundary two stages both hold a non-blank fraction, both become 1, and that
month's revenue is written against both. So **any total that sums over `Task Stage` exceeds
`Price (with Tasks)`** — and `Milestone Amount`'s `[remove sum: … 'Task Stage']` does exactly
that. Fixing the percentages alone will not make step 0's exit criterion
(*"Cashflow figures reconcile to Summary Budget for one version"*) true.

It is also not confined to the milestone schedule. The identical construction appears in:

| Metric | Id | Consequence |
|---|---|---|
| `Phased Cost` | `78ea54a9-…` | The Cash Payments line |
| `Cash Receipts` | `8535c37a-…` | Reads `Phased Earnt Revenue [remove sum: TS, …]` — **the main chart is wrong in Monthly Billing mode too**, not only Milestones |
| `Total Hours Estimate Study Phases` | `21d0c1e4-…` | → `Total FTEs Estimate Study Phases` → the Cockpit resourcing thumbnail and the Phase-2 Resource Summary Frame |

**Add F1b:** replace `IFDEFINED(Milestone_Period, 1)` with `Milestone_Period` in those three
metrics. Within a month the fractions across contiguous stages sum to 1, so the month splits
correctly instead of duplicating.

That is a formula change in three places plus revalidation of the FTE chain. **Step 0 at
1.5 days is light; budget 2.5.**

## 2. Frame 2 has no read path for `Start Date`

§5 shows Start Date as an editable header field, and dragging the first bar's left edge
writes it. But the only read binding is `[FRM] Timeline Inputs` on `.Assumptions - Timeline`
(`0a23a60b-…`), whose metrics are `Default Task Phase Span`, `Milestone - From`,
`Milestone - Months`, `Milestone - To`. **`Start Date` is not in that table** — it sits in
`.Assumptions - Financial` (`e01ac02e-…`) and `.Assumptions - General` (`cf9fb249-…`).

Metric bindings are write-only in the SDK; there is no `subscribeToMetric`. So the Frame
cannot display the current value.

**Fix:** add `Start Date` to `[FRM] Timeline Inputs`, or create a one-cell `[FRM] Start Date`
view paged on Project Version.

## 3. §5/§6/§7 binding tables contradict §8

§8 says every View a Frame subscribes to should be a Frame-owned `[FRM]` copy, *"the shared
`55be5e8a-…` view is the cautionary case"*. The per-Frame binding tables still point at the
native board views:

`6e4fd484-…`, `fd51bda3-…`, `7583519c-…`, `834ba283-…`, `20a39aff-…`, `dc0e43b3-…`,
`5b84c6d4-…`, `592c49b4-…`, `77db93b7-…`, `fc9086f8-…`

§8 is right; the tables need rewriting to the `[FRM]` aliases. `7583519c-…` is the sharpest
case — it is already bound to three boards.

Also, §6's binding table omits `cashAssumptions`, even though §8 creates
`[FRM] Cash Assumptions` for it. Without it the billing-type segmented control and the
payment-terms field have no current value to render.

## 4. Two SDK assumptions to prototype on day one

Neither is documented in the Frames skill, and both are load-bearing.

**(a) Does `subscribeToItems` return item *properties*, or only names?**
The skill documents `d.items` and `d.partialResult` and nothing more. Frame 1's entire card
design — Client, Owner initials, Win Likelihood ring, status lane, version-type badge —
depends on reading list properties, as does the version switcher's
*"filter to `Version Type = Current`"*. If `items` carries names only, Frame 1 needs Views
over the list properties instead and the design changes materially.
**This is the single biggest unknown in the brief.**

**(b) Can `editValue` write a Dimension-typed metric by item name?**
§6 writes `Project_Billing_Type` (Dimension → `Billing_Type`) and assumes
`value = item name`. The SDK signature is `value: boolean | number | string | null` —
plausible, unverified. If it does not work, the billing-type control drops out.

**Correction while we are here.** §9 says `partialResult` gets *"a banner + search on the
Portfolio Frame"*. There is **no pagination API** — a search box cannot recover items the
subscription truncated. The mitigation is a banner plus a link to the native list.

## 5. Options in or out of the budget?

`[FRM] PV Value` (Rows: Project Version, no columns) and `[FRM] Budget by L1`
(Option Price *"left on pages at All"*) both **sum Main Scope + priced options**. The native
`Summary Budget` has `Option Price` as a page dimension the user can narrow.

If a demo has the native board on Main Scope and the Frame on All, the acceptance criterion
*"every figure reconciles to the equivalent native view"* fails on the headline number.

**Decide explicitly:** does the executive budget include priced options, and does the
Portfolio card value?

## 6. F4 is load-bearing, not polish

Setting the `Change Log` display property is not cosmetic. `editItem(listAlias, item, values)`
addresses an item **by its current name** — with no display property set, Change Log rows are
raw GUIDs, so any Frame write to an existing changelog row is impractical.

`addItem` is unaffected, so Frame 1's *"new version writes a changelog row"* works either way.
But note the Frame must compute the next `Change ID` client-side (a manual Integer with no
sequence), and that races on concurrent creation.

The same mechanic makes Frame 1's *"mark superseded"* depend on `Project Version`'s display
property, which is the formula `Project.Name & " (" & Version.Name & ")"`. That works — but
it means **every write coordinate in every Frame is a formula-derived string.** Worth stating
as a standing risk.

## 7. Pick a different reconciliation anchor

Step 2's exit is *"matches `00. Executive Summary` figures for **Project 1 (v2)**"*.
Project 1 (v2) (`c0dc6935-…`) is Current but has no `Date Initiated`, no changelog entry (the
Project 1 entry is on v1), and versions start empty with nothing copied — it is plausibly a
blank shell.

**Use Project 4 (v1)** (`43799143-…`): it is what `9. Department Review` defaults to, and half
the Benchmark board's default pair.

Not confirmable by reading values — no metric in the app is AI-visible, so `query_data` is
unavailable (extract §10, gap 1) — but the structural evidence points that way.

## 8. Two open decisions settleable from the model

### Version creation — copy configuration, not an SDK burst

Not close. An SDK copy would be:

| Input | Cells |
|---|---|
| `Start Date` | 1 |
| `Milestone - Months` | 8 |
| `No. of Active Sites` / `No. of Back-up Sites` / `Sites for Qualification` × 46 countries | 138 |
| `No. Patients Screened` / `No. Patients Randomized` × 3 regions | 6 |
| `Service Active` × 26 services | 26 |
| `/2. General` study header | 14 |
| `Project Complexity`, `Budget Currency` | 2 |
| `Task - Option Price` assignments, plus every prior override | sparse, tens more |

**200+ sequential single-cell `editValue` calls**, each a round trip, with no transaction.

A Pigment metric-to-metric copy configuration does the same in one action and benefits the
native board too. There are none in the app today — `get_metric_to_metric_copy_configs`
returns empty on the project inputs — so this is greenfield.

### F2 may be unnecessary

A `PV Is Current` helper metric is only needed if a Frame must aggregate across versions —
and §3's first principle is that no Frame ever renders a multi-version total. The version
switcher and the card-value selection can both read `Version Type` off the `Project Version`
list client-side (subject to unknown 4(a)).

Keep F2 only if you want the **native** boards to stop double-counting Project 1 on "All" —
a separate and worthwhile fix, but not a Frame prerequisite.

## 9. Smaller corrections

| § | Correction |
|---|---|
| 1 | *"roughly 300 orphaned views"* — the extract says **≤300** (3 pages of up to 100; page 1 held 100). Don't state the ceiling as the count in a client-facing doc. |
| 5 | Stage 5 (`Treatment/Follow-Up Period II`) has **neither** a Start nor an End Milestone, not just no End. |
| 9 | Cells can also be `{kind:'unknown'}`, not only `'loading'`. |
| 9 | The *"Cells arrive column-major…"* row has an unescaped pipe inside backticks that breaks the table. |
| 10 | Whether an ActionButton can navigate to a **Frame** is unverified — board configs only expose `navigateToBoardConfig` with `applicationId`/`boardId`. If it cannot, the "two UIs as peers" story needs the left-nav route instead. Check early, not in step 6. |
| 11 | Anonymisation: one `Team` email is `@gopigment.com` — a Pigment employee in a dataset shown to a Pigment prospect. |

---

## Net

The brief is sound and the build order is right. The blocking changes are **F1b**, the
**Frame 2 `Start Date` binding**, and **resolving the two SDK unknowns before step 1**.
Everything else is edits.

# `[FRM]` view register

Created 20 Sep 2026 in **[POC] Clinical Trials Pricing Application** (`7aa30303-07af-4861-a8e7-7bc1e0ea7d13`).

These are the seventeen Frame-owned views from §8 of the briefing. Every one is a fresh view, not a repoint of a board view, so a board edit can never break a Frame and vice versa. **Do not attach any of these to a board widget.**

Bind Frames to the **view id** in the left column.

| View | View id | Block | Block id | Rows | Columns | Pages | Frames |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `[FRM] PV Value` | `4f418136-2c70-42d9-9cdb-ddf367019358` | `Price (with Tasks)` | `61bc84a1-d0eb-43c6-a83f-b1acf573a83d` | Project Version | — | Option Price **pinned to Main Scope** | 1 |
| `[FRM] Timeline Inputs` | `bf6e6a77-45b7-477f-b58c-30efff0e7a55` | `.Assumptions - Timeline` | `0a23a60b-b9a3-4e54-8a7c-91ea55777ad4` | Task Stage | Metrics | Project Version | 2 |
| `[FRM] Start Date` | `484f4ee9-02cb-42a7-9ef2-cbf85e8ea39e` | `Start Date` | `4fb85253-fc27-4bde-9605-efd2d0d7a25d` | — | — | Project Version | 2 |
| `[FRM] Phase Grid` | `dd54ad19-a695-4c9b-8c20-4c6c4f48e327` | `Milestone_Period` | `d80aa426-396b-48d3-a2b9-f33609b98ca4` | Task Stage | Month | Project Version | 2, 3, 4 |
| `[FRM] Span Grid` | `1726dd44-7214-42ca-b2d8-276b414bce3d` | `Milestone_Period_Multi_Stages` | `a154b2a2-07d8-4660-8d86-bc9d519e1eb3` | Dual Timeline Stages | Month | Project Version | 2 |
| `[FRM] Milestone Months` | `b3b35096-b03c-4b71-95b6-297ea55bbdf3` | `Milestone_Acheivement` | `d274cd5b-8ede-4885-a0cc-c1e6d671cab2` | Task Stage | — | Project Version | 2, 3 |
| `[FRM] Cash Summary` | `9a4ad34e-46b3-4627-aaa9-efd29197a357` | `[TBL] Cashflow Summary` | `ec2e3300-8e25-454c-9cb4-3e5cfff890c6` | Metrics | Month | Project Version | 3, 4 |
| `[FRM] Peak Cash` | `76013dad-b2b8-4593-8f5f-81ed100e97fd` | `Peak_Cash_Position` | `99d5f206-15f9-4864-b1bf-5fd56663cb87` | — | — | Project Version | 3, 4 |
| `[FRM] Milestone Schedule` | `05e7e836-ec03-4880-b072-6bd77f049ab8` | `[TBL] Milestone Schedule` | `a66b7684-c0ab-43ba-8c69-7393d184f800` | Task Stage | Metrics | Project Version | 3 |
| `[FRM] Cash Assumptions` | `b930f166-c6a1-4712-a292-6417d1b997c0` | `[TBL] Cashflow Assumptions` | `2514bffa-6ec6-4f96-8081-be0343505455` | Metrics | — | Project Version | 3 |
| `[FRM] Approval Summary` | `1c314d85-fab7-424f-b2fa-bcfe0f19562d` | `[TBL] Approval Summary` | `a071e66b-c9f6-411a-813c-f49ef349cc16` | L1 | Metrics | Project Version | 3, 4 |
| `[FRM] Study Header` | `ed273ff4-2cc4-4fdd-8ca8-f3fea8abddf2` | `.Assumptions - General` | `cf9fb249-39b8-4b24-81b0-e5a16a78a69c` | Metrics | — | Project Version | 4 |
| `[FRM] Services` | `393cef04-4f9c-4d27-a96a-39d337c19d2d` | `Exec Summary` | `3b98a145-dc61-4ca3-a156-c01a463467f9` | Metrics | — | Project Version | 4 |
| `[FRM] Budget by L1` | `458b1f99-a02c-4971-9ec0-197e96432a6d` | `[TBL] Executive Summary` | `450bebed-6e91-48cf-8104-27c7ebc0d99f` | Task Defintion → **L1 Task** | Metrics | Project Version; Option Price **pinned to Main Scope** | 4 |
| `[FRM] KPI Patients` | `a9e3a292-4c9f-468c-8c1b-8cf774bdcb5d` | `No. Patients Randomized` | `03aefd75-c0c0-49f5-a5f2-a65b458923f1` | — | — | Project Version | 4 |
| `[FRM] KPI Sites` | `f523edd1-9f4b-4592-bbd5-5dfa0d754eb3` | `No. of Active Sites` | `4aa8bcad-ad36-4bac-9e1f-48b07e4b8317` | — | — | Project Version | 4 |
| `[FRM] Project Status` | `66818680-7dc5-496b-8b67-776cf4e2f6ae` | `Current Project Status` | `d9d4643b-04a1-4b66-acbc-bb2cf062305e` | — | — | Project Version | 4 |

## Decisions applied at creation

**Single-version scope is structural, not a code convention.** Every view carrying a `Project Version` page has `singleModality: true`. A Frame that forgets to call `updatePageDefinitions` renders one version, never an eight-version total. This makes the briefing's acceptance criterion *"No Frame can display a multi-version total"* a property of the model rather than of the JavaScript.

`[FRM] PV Value` is the one exception: `Project Version` is on **Rows**, because the portfolio lists every version by design. It has no Project Version page at all.

**Options: Main Scope only** (per the options decision). `[FRM] PV Value` and `[FRM] Budget by L1` each carry an `Option Price` page with `singleModality: true` and both `filteredModalityReferences` and `availableModalityReferences` fixed to `Main Scope` (`51bedaab-2de9-43dd-a4fd-b523dae7e45c`). It cannot be widened from inside a Frame. Switching to All later means editing those two pages, nothing else.

*(A plain view filter was not usable here: `update_view_filters` rejects a `pivotFieldId` that refers to a Pages pivot, and putting `Option Price` on Rows or Columns would have changed the payload shape the Frames read.)*

## Two corrections to §8 of the briefing

1. **`[FRM] Budget by L1` rows.** The briefing said "Rows: L1". `[TBL] Executive Summary` is not dimensioned by the `L1` dimension — it groups `Task Defintion` by its `L1 Task` property, as §3 of the architecture extract records. The first attempt with `dimensionId = L1` was rejected by the server (`Remove invalid pivot(s)`) and produced a view with no row pivot. The pivot is a `Grouping`, not a `Dimension`: `dimensionId = 7c1475b1-…` with `listPropertyPath = ["L1 Task"]`. `[FRM] Approval Summary` **does** use the real `L1` dimension (`05fba1a3-…`) — that one was right.

2. **Two table views inherited more metrics than the briefing listed**, because a table view seeds every metric the table carries:
   - `[FRM] Cash Summary` came back with five values — `Cash Receipts` **twice** (the native board's "Cash Position" duplicate, rendered as a difference) plus `Month_Filter_Cashflow`. Trimmed to the three the briefing specifies: Cash Receipts, Phased Cost, Phased Earnt Revenue. The Frames cumulate and difference in code.
   - `[FRM] Budget by L1` came back with `Net Margin` twice (the native "Net Margin %"). Trimmed to four: Price, Cost, Net Margin, % of Budget.

   Row and column order in the payload follows the order above, so a Frame can index positionally — but prefer matching on the label.

## Not yet done

- None of these views is attached to a Frame yet.
- `Phasing Leak Check` (`b0bc4d81-594a-4f64-9e43-1f67c0309ddd`) has no view and is not on a board.

# Frame sources

Source of truth for the four Frames. **Edit these files, never a Frame body in Pigment** — the sandbox has no module system and no network, so every Frame body must be one self-contained script, and `build.py` is what assembles it.

```
_shared.js          tokens, SDK helpers, lifecycle, canvas, states, version switcher
cockpit.js          Frame 4, full version - NOT deployed (56 KB; see below)
cockpit1.js         Frame 4 as deployed  -> Executive Summary (Frame)  ddaf6ce8
timeline1.js        Frame 2 as deployed  -> Timeline (Frame)           d383328a
apiprobe2/3.js      throwaway API diagnostics; delete the probe Frame when done
build.py            assembles a body, lints it, and emits a deploy twin
build/              generated; safe to delete
```

| Frame | Source | Live id | Writes |
| --- | --- | --- | --- |
| 4 Executive Summary | `cockpit1.js` | `ddaf6ce8-6230-4f60-ae84-30791528026c` | preparer note |
| 2 Timeline | `timeline1.js` | `d383328a-c555-43db-b8ca-fda335bf1d77` | `Milestone - Months`, `Start Date` |
| 1 Portfolio | not built | | |
| 3 Cashflow | not built | | |

```
python3 frames/build.py --all      # or: python3 frames/build.py cockpit
```

## Deploying, and keeping the repo honest

`cockpit1.js` is **live on Frame `ddaf6ce8` (Executive Summary) and byte-identical to it** — 28,354 bytes both sides. It carries no header comment for that reason; its purpose is documented here instead.

Pushing a body means retyping it into a JSON tool argument, which is why `build.py` forbids double quotes and backslashes: newlines become the only escaping, and the risk of a corruption that still parses drops sharply. It does not reach zero.

**The drift is systematic, not random: comment blocks get dropped.** It happened on the first push of `cockpit1` (819 bytes) and again on `timeline1` (861 bytes) — both times comments and nothing else, both times caught by comparing `bodySizeBytes` against the local build. So `build.py` now also emits `build/<name>.deploy.js`, a comment-free twin, and **that** is what you transcribe into `create_frame` / `update_frame`. Nothing left to drop removes the failure class; the rationale stays here in the repo. `update_frame_body` needs none of this, because it validates every anchor against the live body before writing.

So, after any push:

1. **Prefer `update_frame_body` over `update_frame`** once a body is live. It validates every `oldString` against the current body before writing anything, so drift surfaces as a rejection instead of a corruption. Seven edits applied cleanly is seven pieces of evidence that the deployed code matches.
2. **Compare `bodySizeBytes` with the local build.** Equal sizes plus matching edits is a strong check; a mismatch means the repo is lying about what is running, which is worse than a bug.
3. If they differ, **reconcile the local file down to what is deployed**, not the other way around, unless the missing content is functional.

`cockpit.js` (the fuller 56 KB version with the shared module, runtime filter negotiation, tooltips and the truncation banner) is **not deployed**. It is the target to grow back into once stage 1 has been exercised; deploying it would mean retyping 56 KB, which is where corruption becomes likely rather than possible.

The lint pass rejects what the sandbox forbids (network, storage, `alert`, Workers, `parent`, `@import`, `<script>`) and what does not survive a JSON tool argument (template literals), and requires the things a Frame body must have (`#app`, `root.__cleanup`, strict mode). It strips comments and regex literals before matching, so prose and `.replace(/'/g, …)` do not trip it — `strip_comments` has its own test cases in the commit that introduced it.

## This tenant's Frames API (probed 21 Sep 2026)

Established by running `apiprobe.js` inside a Frame. The documented API does not apply here.

`window.PigmentSDK` is frozen and has **six** methods:

| Method | Signature | Status |
| --- | --- | --- |
| `subscribeToDataSource` | `(dataSourceName, { dynamicFilters, scroll, onData, onError })` | **the read path** |
| `subscribeToItems` | `(listAlias, { onData, onError })` | unchanged |
| `addItem` | `(listAlias, values)` | unchanged |
| `editItem` | `(listAlias, item, values)` | unchanged |
| `editValue` | `(metricAlias, coordinates, value)` | unchanged |
| `subscribeToVizualization` | `(viewAlias, { pageDefinitions, scroll })` | **removed** |

`subscribeToVizualization` still exists on the object but every call errors:

```
The subscribeToVizualization operation is no longer supported.
Use useSubscribeToDataSource instead.
```

That is why `create_frame` rejects `type: "View"` bindings. **Views cannot feed a Frame in this tenant** — the seventeen `[FRM]` views stay valid native views and still pin down the shape each panel needs, but they are not the data path.

### Three consequences for the design

1. **`pageDefinitions` is gone.** The dataSource handle is `{ updateDynamicFilters, updateScroll, unsubscribe }` — there is no `updatePageDefinitions`. Version selection, which section 3 of the briefing builds the whole shared header around, has to go through **`dynamicFilters` / `updateDynamicFilters`** instead.
2. **The pivot moves server-side into the manifest.** A dataSource declares `labels` (dimension bindings that come back as labels), `selectors` (dimension bindings used to choose what to fetch) and `values` (metric bindings, each with an aggregator). What used to be a view's Rows / Columns / Pages is now this declaration, so each panel needs its own dataSource rather than its own view.
3. **Writes are unaffected.** `editValue(metricAlias, coordinates, value)` is exactly as documented, so the preparer note in Frame 4 and the milestone and timeline writes in Frames 2 and 3 need no change.

### The payload shape (probed, probe v2)

`subscribeToDataSource` returns **row-major and sparse**, nothing like the documented `cells[c][r]`:

```json
{ "rows": [ { "labels": ["Project 1 (v1)"], "values": [-46695.33103840492] },
            { "labels": ["Project 4 (v1)"], "values": [-430930.956920461] } ],
  "rowOffset": 0, "totalRowCount": 6 }
```

- One row per live combination. `labels` holds one string per `labels` binding in manifest order; `values` one number per `values` entry in manifest order.
- **Blank rows are omitted.** The `src` probe returned 6 rows, not 8, because Project 2 (v1) and Project 1 (v2) hold no estimate. A Frame must not assume a row exists for every item.
- `rowOffset` / `totalRowCount` drive `updateScroll`, same windowing idea as before.
- A **selector does not appear in `labels`** — it is the axis you filter on. Left unfiltered it aggregates across everything: the `grid` probe's eight stage values were `Milestone_Period` summed over every month *and* every version.
- Any dimension absent from the manifest is silently aggregated away. `grid` declared no `month`, so the phase values came back summed over all months. **The manifest is the pivot** — there is no view to lean on.

`subscribeToItems` returns:

```json
{ "items": ["Project 1 (v1)", "Project 2 (v1)", ...], "partialResult": false }
```

### ⚠️ `subscribeToItems` gives plain strings, not objects

`items` is an array of display names with **no properties attached**. So the version switcher in section 3 of the briefing cannot filter to `Version Type = Current` from a list subscription — the property is not there to read. Options, cheapest first:

1. A dataSource with `labels: [versions]` and a value metric carrying the version type, aggregated `LastNonBlank`. Needs a Text or Dimension metric on `Project Version` exposing `Version Type`; the model has no such metric today, so this is one small new metric.
2. A `ListProperty` binding (`type: "ListProperty"` with `listId` + `listPropertyTechnicalName`) as a dataSource value — supported by the tool schema, unverified at runtime.
3. Show every version and mark none as superseded — loses a stated requirement.

Option 1 is the one to take, and it is blocked by the same permission policy that refused `Phasing Leak Check`, so that metric has to be created in the UI.

### The `dynamicFilters` shape is negotiated at runtime, not guessed

Its shape is undocumented, so `PF.negotiate` works it out in the Frame: fetch a baseline unfiltered, then try each candidate and accept the first whose payload **actually differs**. A shape that is silently accepted-and-ignored returns the baseline, which is the failure mode an error check alone would miss.

Nothing waits on the result. Every dataSource puts `versions` first in `labels` and each panel narrows client-side, so the Cockpit is correct with no filter at all; a negotiated filter only stops the two month-grained sources fetching all eight versions. If negotiation fails, they fall back to a 1,000-row window and the Frame shows a banner if that window truncates.

### Confirmed accepted by the manifest

- A **`ListProperty` binding used as a `labels` dimension** — `taskL1` (`Task Defintion` / `l1_task_CZQIV1`). This is what makes budget-by-department possible: there is no L1-dimensioned price metric in the model, and the native board only gets it by grouping `Task Defintion` on its `L1 Task` property. The dataSource does the same grouping server-side.
- The same binding as **both a label and a selector** (`versions` on `gantt` and `cash`), so client-side narrowing stays correct whether or not the filter works.
- `Any` as an aggregator for Text and Dimension metrics, and `TextList` for the services strings.

### Tool quirks worth knowing

- Binding fields are camelCase (`viewId`, `listId`, `metricId`, `canRead`, `canWrite`), not the documented snake_case.
- `create_frame` and `update_frame` both **require** `dataSources`; `update_frame` replaces the whole Frame, so resend `bindings` and `dataSources` every time or they are lost.
- `search_frames` reads back `bindings` but **omits `dataSources`**, even when they are stored — the create and update responses do echo them. Do not conclude from a read-back that they were dropped.
- The Frame editor's Resources panel for a *new* Frame starts `{"bindings": [], "dataSources": []}`. Pasting probe code into a fresh Frame therefore produces `No binding found for alias ...` and `The data source ... no longer exists` for everything. That is an empty manifest, not an API limitation.

## Superseded: the original blocker note

## ⚠️ Blocked: this tenant's Frames API is not the documented one

`cockpit.js` is written against the Frames API as documented — View bindings read with `subscribeToVizualization`. **This Pigment tenant rejects that outright:**

```
create_frame -> "Frame bindings with type View are not supported"
```

Verified with a throwaway Frame on 21 Sep 2026. What this tenant *does* accept, confirmed by the same probe:

```json
{
  "bindings": [
    {"type": "List",   "name": "versions", "listId":   "…", "canRead": true},
    {"type": "Metric", "name": "peak",     "metricId": "…", "canRead": true}
  ],
  "dataSources": [
    {"name": "peakSrc",
     "labels":    [{"binding": "versions"}],
     "selectors": [],
     "values":    [{"binding": "peak", "aggregator": "Sum"}]}
  ]
}
```

So data reaches a Frame here through **`dataSources`** — declared server-side from List bindings (as dimensions, on `labels` and `selectors`) and Metric bindings (as values, with an aggregator) — not through a View. `create_frame` *requires* `dataSources`, which the documented API does not mention at all, and the response carries a `dataSinks: []` array that is presumably the write path. Binding fields are camelCase (`viewId`, `canRead`), not the documented snake_case.

### What this costs

- **The seventeen `[FRM]` views are not the Frames' data path.** They are still valid native views and they pin down the exact shapes each panel needs, so they are not wasted — but a Frame cannot subscribe to one here.
- **`cockpit.js` needs its data layer rewritten** — eleven `subscribeToVizualization(viewAlias)` calls become dataSource subscriptions over List + Metric bindings. Everything above the data layer (layout, tokens, canvas, lifecycle, the Gantt and cashflow drawing, the note write) is unaffected, which is most of the 1,295 lines.
- **The runtime method names are unknown.** `subscribeToVizualization` may take a dataSource name here, or there may be a different method. Nothing in the tool surface reveals the in-iframe SDK, and a Frame cannot be executed from this session — there is no authenticated browser session against pigment.app.

### To unblock

Create a scratch Frame in the Pigment UI and paste back the **editor's placeholder body**. That is written against whatever API this tenant actually serves and settles the method names, the payload shape and the write path in one step. Everything else here is ready to re-point at it.

Until then `cockpit.js` is complete but undeployable, and deploying it would only prove that View bindings are rejected — which the probe already showed for the cost of one call.

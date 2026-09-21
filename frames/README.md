# Frame sources

Source of truth for the four Frames. **Edit these files, never a Frame body in Pigment** — the sandbox has no module system and no network, so every Frame body must be one self-contained script, and `build.py` is what assembles it.

```
_shared.js          tokens, SDK helpers, lifecycle, canvas, states, version switcher
cockpit.js          Frame 4 - Executive Summary cockpit (section 7 of the briefing)
build.py            _shared.js + <frame>.js -> build/<frame>.frame.js, with a lint pass
build/              generated; safe to delete
```

```
python3 frames/build.py --all      # or: python3 frames/build.py cockpit
```

The lint pass rejects what the sandbox forbids (network, storage, `alert`, Workers, `parent`, `@import`, `<script>`) and what does not survive a JSON tool argument (template literals), and requires the things a Frame body must have (`#app`, `root.__cleanup`, strict mode). It strips comments and regex literals before matching, so prose and `.replace(/'/g, …)` do not trip it — `strip_comments` has its own test cases in the commit that introduced it.

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

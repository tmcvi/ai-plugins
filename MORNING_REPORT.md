# MORNING_REPORT

> Created 19 Aug 2026 by the overnight build session — this file did not exist in project storage or Drive, so it was created here (Tier-2 decision, see below).

---

## 2026-08-19 · NECE Pipeline Room — frame build (brief v1)

**Status: built, tested, published. Weights left at 90 / 60 / 30 / 10 / 0 (verified).**

- **Application:** NOKIA (`c5a40da4-fc80-40fa-b3ae-2eb69c6db5df`)
- **Frame:** `NECE Pipeline Room` — id `ecb994af-2bdc-4c80-9253-f8c13dace53f`, **published** (`is_private: false`)
- **Link:** https://pigment.app/w/viridian/application/c5a40da4-fc80-40fa-b3ae-2eb69c6db5df/frames/ecb994af-2bdc-4c80-9253-f8c13dace53f (findable in-app by name if the deep-link path differs)
- **Screenshot:** `reports/nece-pipeline-room-2026-08-19.png` (local Chromium harness render at 1920×1080 — see Testing note)
- Boards, `NECE Engine Map`, `Phasing Studio`, and all existing metrics/views untouched. Only sanctioned writes performed (weight cycle below, reset verified exact).

### Backing views (all created fresh, prefixed `v_pr_` / `weights_read`)

| Alias | View id | Expect | Verified |
|---|---|---|---|
| `v_pr_funnel` | `585e1f64` | Σ gross 524.4 / Σ weighted 149.8 | 524,387.3 / 149,813.9 €k ✓ (Commit→Omit, Won/Lost filtered out) |
| `v_pr_kpis` (stale KPI) | `e96b7df3` | ~42 | **89,732.6 €k — ⚠️ defect A3 has not landed** (see flags) |
| `v_pr_close` (global) | `71b7fcd4` | Dec-26 max; FY26 96.4 / FY27 53.4 | Dec-26 = 28,821.5 max ✓; FY26 96,438.5 + FY27 53,375.4 = 149,813.9 ✓ ties to weighted exactly; no pipeline closes before Aug-26 ✓ |
| `v_pr_runway` (market-paged) | `94ee5f5b` | respects market filter | page = Deal→Country→Market v1 grouping; paged via `updatePageDefinitions` ✓ (harness) |
| `v_pr_mix` | `02b6c6b1` | NA 35.9/30.5/8.7; FR unid ≈31% | Same Table block + same pivots/filters as the B2 mix view → ties to the board **by construction**. FY26 totals verified in aggregate: booked 151,927.6 + weighted 96,438.5 + unid 58,128.3 = 306,494 ≈ OI Total 306,505 (rounding metric). Per-market split could not be pulled through `query_data` (NL engine collapses rollup groupings) — spot-check NA/FR on the frame at first open. |
| `v_pr_walk` | `665993b0` | ties to board walk | Added 275,029.8 · Won 185,164.0 · Lost 42,803.0 (Dec-25→Jul-26) ✓ |
| `v_pr_snap` | `6877c04e` | walk endpoints | Opening Nov-25 477,740.0 · Closing Jul-26 531,904.3 → residual ±resize/push = **+7,101** ties the walk ✓ |
| `v_pr_deals` | `3b7e3370` | slip pair present | NCE-25-0691 (5,599.9) & NCE-26-0422 (2,600.0) present ✓; status=Pipeline filter; server-sorted value desc |
| `v_pr_deal_close` | `35838663` | close per deal | Effective Close Month per pipeline deal (join key for list + Dec-26 concentration) ✓ |
| `v_pr_slip` | `ce88189c` | slip pair | filtered Slip Candidate = true (flag source) ✓ |
| `weights_read` | `c5fbf5e1` | 90/60/30/10/0 | 0.90 / 0.60 / 0.30 / 0.10 / 0.00 ✓ (decimals; sliders display %) |

Frame bindings: 11 views (read) + `weights_write` (Metric `49c55361`, can_write) + `forecastCategory` List (editValue coordinates) + `marketList` List (runway paging).

### Weight cycle — live model test (sanctioned write)

| Step | Result | Timing |
|---|---|---|
| Commit 0.90 → 0.85 | Weighted 149,813.92 → **147,465.03** (Δ 2,348.89 = **exactly 5% × Commit gross 46,977.8**) | write call ≈ 15.6s MCP round-trip; recalc already complete on the first follow-up query |
| Downstream reflow | FY26 weighted closing 96,438.5 → 94,089.6 (full Δ lands in FY26) | same query |
| Reset 0.85 → 0.90 | Weighted restored to **149,813.92170923 — exact** | same pattern |
| End state | Weights 90/60/30/10/0 confirmed (Won/Lost 0) | — |

In-frame cycle (harness, stubbed SDK with 650ms write latency): drag-release → `editValue` → locked sliders → shimmer → data repush → full reflow ≈ **2.1s per leg**; error path toasts and reverts the handle; reset writes only changed categories sequentially.

### Acceptance

- ✅ KPIs & Sankey tie: Σ gross ribbons = 524.4 · Σ teal = 149.8 = converged node = 96.4 + 53.4 (exact in data)
- ✅ Zone 3 = the board's mix table re-expressed (same Table, same grouping/filters); FY27 renders without a Booked segment; % secured = (Booked+Weighted)÷Total computed at display level
- ✅ Weights cycle: drag → recalc → reflow → **reset restores 149,813.92 exactly**; sliders lock in flight; error path toasts + reverts (all exercised)
- ✅ Market click filters runway (`updatePageDefinitions`) + focus list; ring on bar; chip in header; Esc / ✕ / re-click clears; slip pair flagged amber
- ✅ No table grids; every figure carries €m / €k / % units; hot-reload clean (`__cleanup` verified); zero console errors in harness; `prefers-reduced-motion` + ⏸ Motion control; 1080p no-scroll (fixed 1920×1080 stage, scale-to-fit)
- ✅ Scope log: created 11 views + 1 frame, nothing else modified; sanctioned weight writes reset to 90/60/30/10/0 at run end

### ⚠️ Flags

1. **Defect A3 not landed:** stale pipeline reads **€89.7m (17.1% of gross)**, not ~€42m. Card is bound and shows the live value with a %-of-gross chip, per brief — fix A3 and the card corrects itself.
2. **Dec-26 concentration = 42% is the *gross* close basis:** share of gross pipeline closing in 2026 that closes in Dec-26 = **42.5%** (95,201.8 / 223,936.6 €k, verified from the deal-level join). The weighted-basis share is 29.9% — the brief's 42% matches gross. The frame computes it live from the deals ⨯ close-month join and the runway callout respects the market filter.

### Tier-2 decisions

1. **No `Frame Views` folder** — the MCP `create_view` API has no folder parameter; views are grouped by the `v_pr_` prefix + "NECE Pipeline Room:" descriptions instead.
2. **`v_pr_kpis` is the stale KPI only** — a single KPI view holding gross/weighted/stale/Dec-26 would need a new Table block (out of scope); the other four KPIs derive in-frame from `v_pr_funnel`, `v_pr_close` and the deals join.
3. **11 views instead of 7** — `v_pr_runway` split from `v_pr_close` so Zone 1/Sankey stay global while Zone 4 pages by market; `v_pr_snap` supplies walk endpoints; `v_pr_deal_close` + `v_pr_slip` supply the focus-list join (the server silently drops boolean-property groupings, so slip flags come from a filtered view).
4. **Focus list re-scopes client-side** (market is a row-grouping level of `v_pr_deals`; a grouping can't be in rows and pages at once); the runway uses `updatePageDefinitions` as specified. Identical data, instant filter.
5. **Walk ±Resize/push bar is the residual** (Closing − Opening − Added + Won + Lost = +7.1m); pushed/pulled totals appear in its tooltip as value-neutral timing context.
6. **Testing without a Pigment browser session** (remote container, MCP-only): frame exercised in a local Chromium harness against a stubbed PigmentSDK loaded with the verified live aggregates — full drag/write/reflow/reset cycle, market filter, FY toggle, sort morph, error path, cleanup; zero console errors. Model-side weight cycle executed via MCP (table above). The screenshot is the harness render; numbers on it are the real aggregates.
7. **MORNING_REPORT.md created here** — it existed neither in the repo, in project storage (not configured in this container), nor on Drive.

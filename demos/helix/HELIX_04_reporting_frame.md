# HELIX · Step 4 — Reporting frame  [CLAUDE via Pigment MCP · ~30 min, one 2-minute check by Tom]

**Precondition:** Step 3 is done. All metrics exist and the sanity values tie.

**Purpose:** show what an AI-built, presentation-grade **output report** looks like on live Pigment
data: a one-page management report, **`Bookings to Billings Report`**. It reads like a polished
board pack page, not a dashboard. (The "Anchor Room" spine visual has been dropped. Don't build it.)

## Operating rules
- Work **only** in `HELIX | Bookings to Billings`. Load the `building-pigment-frames` skill first.
- Create the frame once with `create_frame`. After that, edit with `update_frame_body`, which does
  find-and-replace with max 20k characters per edit. Use `update_frame` only to change bindings or
  data sources, and it replaces everything, so resend all of them.
- **Run `publish_frame` after every create or update.** Updates can flip a frame back to private.
- Smoke-test locally before every publish. Chromium and Playwright are preinstalled. Write a
  harness in the scratchpad with a mock `window.PigmentSDK`, render at 1440×900, check for zero
  console errors, and look at the screenshot.

## Frames API (current) — what changed since the NOKIA build
- **Bindings of type `View` are rejected** ("Frame bindings with type View are not supported").
  Use **`List`** and **`Metric`** bindings plus **`dataSources`**:
  `{ name, labels: [{binding: <List>}], selectors: [], values: [{binding: <Metric>, aggregator}] }`.
  A data source with no labels returns a single value; a list label returns one row per item.
- The SDK call that reads a data source **is not documented in the frames skill**, and the SDK
  script can't be downloaded from the cloud container. So **4.1 probes the runtime first**.

---

## 4.1 Probe the SDK (the one human checkpoint)
1. Create a tiny frame, **`ZZ SDK Probe`**, with one Metric binding (`mBill` → `Billings FY26 YTD
   EUR`) and one data source (`probe`, no labels, value `mBill`). Its body should:
   - list every key on `window.PigmentSDK` and on its prototype, with `typeof`;
   - for each function whose name matches `/source|subscribe|query|fetch|get/i` (skip `subscribeToItems`), call it with `'probe'` and `{ onData, onError }`;
   - print each call's return value, every `onData` payload (`JSON.stringify`, first 600 characters) and every error;
   - render all of it into a large `<pre>` with `user-select:text`, so Tom can copy it.
2. Publish it and give Tom the link with this message: *"Open ZZ SDK Probe, wait 5 seconds, copy
   the text and paste it here."*
3. **This is the only point where you wait.** From the pasted output, record:
   - the method name and its call signature;
   - whether it returns a handle with `unsubscribe`, or a Promise;
   - the exact payload shape: column-major `labels` / `cells` like views, or a row array.

   Then delete the probe frame.

Write the report's data layer against **that** API. Keep a small `normalise()` adapter anyway, plus
a 12-second failsafe that shows a readable diagnostic box instead of a blank page.

## 4.2 Helper metrics (folder `Calculations`, prefix `RPT`)
Create only what the report needs beyond Step 3.

| Metric | Dims | Formula / purpose |
|---|---|---|
| `RPT Customer Tag` | Customer (Text) | `'Customer'.'Customer Key' & "|" & 'Customer'.'Name' & "|" & IFBLANK('Customer'.'Segment'.'Name',"") & "|" & IFBLANK('Customer'.'Source System'.'Name',"")`. Labels for top accounts and the reconciliation list. |
| `RPT Axiofood GM %` | Quarter | `'GM % by Customer Quarter'[FILTER: 'Customer' = ITEM("C10043", 'Customer')][REMOVE FIRSTNONBLANK: 'Customer']` |

Bindings: Lists `month`, `quarter`, `segment` and `customer`, plus a Metric binding for every
metric you read.

| Data source | Labels | Values |
|---|---|---|
| `kpis` (or one each) | none | Billings FY26 YTD, Bookings Won (Sum), Coverage %, Gross Margin %, Unbilled Backlog (Sum), Orphan Billings (Sum), Won Never Billed (Sum), Top 10 Concentration % |
| `trend` | `month` | Bookings Won EUR (Sum), Billings EUR (Sum), Gross Margin EUR (Sum). The frame rolls months up to quarters itself. |
| `segments` | `segment` | Coverage % by Segment, Billings by Segment (Sum), Bookings Won by Segment (Sum) |
| `accounts` | `customer` | RPT Customer Tag (FirstNonBlank), Billings Total, Bookings Won Total, Unbilled Backlog, Billings Rank |
| `margin` | `quarter` | GM % by Quarter, RPT Axiofood GM % |

## 4.3 Report design
House style: navy `#0B1F3A` and accent `#005AFF`. The body sits on a light paper card (`#F6F8FC`,
navy text) inside a navy page margin. It should read like a printed board pack page.

Layout at 1440×900, with every number live:
1. **Masthead.** Eyebrow "HELIX INSTRUMENTS · MANAGEMENT REPORT", title "Bookings to Billings", and
   a subtitle "Period to Sep-26 · Source: CRM (PostgreSQL) + ERP (MSSQL), joined in Pigment on
   Customer". A small "Live" pill sits on the right.
2. **KPI band** of 5 tiles: Billings FY26 YTD, Won bookings, Coverage, Gross margin, Unbilled
   backlog. Each tile has the big number, a one-line plain-English caption and a thin accent rule.
3. **Executive summary.** Three auto-written bullet sentences generated from the data, not
   hard-coded. For example:
   - *"Coverage is 75.9%: €53.3m billed against €70.2m won, leaving €16.3m of backlog to invoice."*
   - *"SMB bills ahead of bookings (140%), Enterprise lags (66%)."*
   - *"Axiofood GmbH margin fell from 45.6% to 34.4% year on year: a pricing review candidate."*
4. **Main chart, left two-thirds:** quarterly won vs billed as paired SVG bars, with a coverage %
   line on a secondary axis. Label the axes, values in €m, and hover tooltips.
5. **Right column:**
   - coverage by segment as bullet bars with a 100% reference line;
   - the gross margin trend as a small multiple: blended vs Axiofood lines.
6. **Bottom band:**
   - top 10 accounts as a ranked horizontal bar list: name, segment chip, billed €m and a backlog
     marker. **No table grids.**
   - a "Data integrity" panel: 123 customers, 116 matched, 4 CRM-only (€3.0m won, never billed),
     3 ERP-only (€0.59m billed, no CRM record). Then the one-line anchor formula in monospace.
7. **Footer:** "Generated live from Pigment · every figure traces to the Customer anchor".

Craft rules:
- SVG for all charts, crisp at HiDPI. Tabular figures. Units on every number.
- Sentence-case labels. No emoji.
- A loading veil gated on the hero feeds (KPIs + trend), naming the pending feeds, with a
  12-second failsafe.
- One subscription per data source. Debounced render. Full `__cleanup` on reload.

## 4.4 Build, test, publish
1. Build `frame.js` in the scratchpad. Mock all five feeds **in the exact payload shape recorded
   in 4.1**, using the sanity values from Step 3.
2. Smoke-test in Chromium: zero errors, screenshot at 1440×900 and 1280×720, and check that
   nothing overlaps or clips. Iterate until it looks like a finished report page.
3. `create_frame` with the empty body placeholder `/*BODY*/` plus bindings and data sources. Then
   fill it with `update_frame_body` in chunks of 20k characters or less.
4. Read the frame back with `search_frames` and diff its body against the local file.
5. `publish_frame` and confirm `isPrivate: false`.
6. Ask Tom to open it once. If the diagnostic box appears, fix it from his screenshot, update,
   re-publish and re-check.

## Finish
Print:
- the frame link;
- the final local screenshot path;
- the SDK method and payload shape you used, so the frames skill can be updated;
- the decision log.

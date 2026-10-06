# Management Reporting Pack (Pigment Frame)

A slide-style management deck for the monthly business review, built as a Pigment Frame in
**[DEMO] [FP&A] 01. DEMO Pigment Official Tour 2025**. It has 11 slides, one per screen, and reads
every figure from the Views behind the widgets on three boards:

- **3.1 P&L Analysis & Rolling Forecast**
- **3.4 Cashflows**
- **3.5 Price Volume Mix Analysis**

The deck computes variances, margins, running totals and headline text from the View cells. It has no
hard-coded numbers.

| File | Purpose |
| --- | --- |
| `frame.js` | The Frame body (pure JS, one IIFE, cleans up on hot reload). Paste it into the Frame editor or push it with `update_frame`. |
| `bindings.json` | Binding names and the View and List IDs the body expects. |
| `preview/index.html` + `preview/mock-sdk.js` | Offline preview with a mock `PigmentSDK` (synthetic numbers) for layout work. |

## Slides and sources

| # | Slide | Bound Views |
| --- | --- | --- |
| 1 | Cover | Selected period only |
| 2 | Executive summary: 6 KPI tiles with variance badges and sparklines, 3 generated headlines | `vLand`, `vCompMonth`, `vCompYtd`, `vRev`, `vCash`, `vBudFy`, `vPvm` |
| 3 | P&L overview: period, year to date and full year, with variance columns | `vLand`, `vCompMonth`, `vCompYtd`, `vBudFy` |
| 4 | Revenue & margin trend: 12-month revenue bars (forecast hatched) over an aligned gross-margin panel | `vLand`, `vRev` |
| 5 | Rolling forecast: full-year EBITDA bridge from Budget to current forecast, plus monthly revenue lines | `vLand`, `vBudFy`, `vRev` |
| 6 | Operating expenses: stacked monthly bars by category, top three full-year variances | `vLand`, `vBudFy` |
| 7 | Cash flow waterfall: opening, inflows, outflows, closing | `vCash` |
| 8 | Cash trend & runway: trailing 12 months, low-point line, months of runway | `vCash` |
| 9 | Price / volume / mix bridge | `vPvm`, `vPvmSet` |
| 10 | PVM by product: heat-grid sorted by absolute impact | `vPvmProd`, `vPvmSet` |
| 11 | Appendix: definitions, data sources, refresh time, data checks | All |

## Selectors and page definitions

The toolbar holds the **reporting period** (the months of the current financial year, actuals and
forecast) and the **comparison** (Budget or Prior year). Each View has exactly one subscription. A
change in either selector calls `updatePageDefinitions` on the Views that depend on it:

| View | Page definitions |
| --- | --- |
| `vCompMonth` | `version` = Budget, or Actual for prior year · `year` · `month` = the period (or the same month a year earlier) · `currency` = GBP |
| `vCompYtd` | the same, with `month` = January to the period |
| `vRev` | `year` = prior and current year · `month` = their 24 months · `currency` = GBP |
| `vCash` | `version` = Actual · `year` = prior and current year |
| `vLand` | `version` = Actual + Forecast (board 3.1 default) |
| `vBudFy` | `version` = Budget |
| `vPvm`, `vPvmProd` | `currency` = GBP |

The default period is the latest closed month according to **Manage Actual Period** (Load Actuals).

## Known limits

- **Scenarios.** Frames cannot read or select Pigment scenarios, so the deck shows the scenario Pigment
  serves to Frames, not the scenario picked on the boards (board 3.1 defaults to March Reforecast).
  For the same reason the **Prior forecast** comparison is shown but disabled: this model keeps prior
  forecasts as scenarios, and its Version list holds only Actual, Budget and Forecast.
- **Cash flow categories.** Board 3.4 models receipts and payments only. Investing and financing flows
  are not split out, so the waterfall shows opening → inflows → outflows → closing. There is also no
  minimum-cash metric, so the trend marks the lowest balance in the window instead.
- **Cash version.** Cash reads the Actual version. If that version has no balances, the deck switches to
  the Budget version that board 3.4 uses, and labels the slides to say so.
- **PVM comparison.** The PVM Views follow the years and versions set in **PVM Settings** on board 3.5.
  The deck period does not change them; slides 9 and 10 show which comparison is active.
- **Full-year budget by account** comes from the P&L Reforecast "Version Comparison" View with
  `version = Budget`. On board 3.1 that View's Version page offers only Actual and Forecast. If Pigment
  rejects Budget there, slides 5 and 6 show an error state, and the P&L table falls back to budget
  revenue only.
- **Account categories** in the P&L Reforecast View are taken from the innermost hierarchy level, then
  from the account code (4xx revenue, 5xx direct costs, 6xx opex, 7xx–9xx ITDA & other). The Appendix
  checks that actual revenue in this View agrees with "Actuals vs. Budget vs. Forecast".
- **Currency.** GBP is selected on every View that has a Currency page. The REP reporting metrics do not
  change with the Currency dimension, so they show the model's reporting currency. To use another
  currency, change `CONFIG.currency` at the top of `frame.js`.

## Preview locally

Open `preview/index.html` in a browser. These query parameters exercise the deck's other states:
`?fail=vCash,vBudFy` (View errors), `?empty=vPvmProd` (empty View), `?slow=1` (loading skeletons) and
`?shape=b` (different pivot order).

Keyboard: ← / → (or Page Up / Page Down) move between slides, Home and End jump to the first and last
slide, P toggles presenter mode, Esc closes the slide menu.

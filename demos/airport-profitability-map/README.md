# Airport Profitability Map: Manchester Airport prototype (Pigment Frame)

An interactive floor plan of Manchester Airport (MAN) with each commercial unit coloured by how
much profit it makes for the airport. Viewers drill from the airport to a terminal, a pier and a
single unit, then run what-if changes that write back to Pigment and recalculate the whole map.

## What is real and what is invented

| Real (from public sources) | Invented for the demo |
|---|---|
| Terminal 2 with **Pier 1** (opened 2019, 11 contact stands) and **Pier 2** (12 gates, A380-capable double air bridges) | Every unit's sales, costs, profit, lease date and minimum guarantee |
| **Terminal 1 closed** (reported as 15 March 2026); Terminal 3 extends into part of its space; Ryanair operates from T3 | Unit positions inside each terminal, and gate labels (`P1·4`, `T3·2`) |
| **The Station** (rail, Metrolink, coach) and the **Skylink** walkway | The split of passengers between terminals and piers |
| Runways **05L/23R (3,048 m)** and **05R/23L (3,050 m)**, running SW–NE with the terminals to the north-west | Budget figures and the budget-vs-actual stories |
| **~32.1M passengers in 2025**; 2026 is set slightly above that | 2026 monthly passenger figures |
| Walk-through duty free of **2,165 m²** in T2; **1903** and **Escape** lounges; **JetParks 1–3**, JetParks Plus, Long Stay, Mid Stay, the three multi-storeys, Meet & Greet | |

The map is **north-up and geographic**:

- The basemap is traced from a map screenshot by `tools/trace_basemap.py`. It covers the airfield boundary, runways and taxiways, the M56 and local roads, the River Bollin and other water, woodland and built-up areas.
- Both runways sit on their measured 39° line.
- The terminals, piers, The Station, the hotels and the car parks are placed where they sit on the map.
- Only the **terminal interiors are schematic**.

**3D view (default).** The view is rendered with plain WebGL in `src/map3d.js`. The build inlines it into the Frame body, because Frames cannot load libraries.

- The traced basemap is painted onto two ground textures: a 2048 px texture for the whole airfield and a 4096 px texture for the terminal area.
- Terminals, piers, The Station, the Skylink, the hotels and the World Freight Terminal are extruded in 3D. Aircraft sit on every stand.
- Roofs are coloured by zone total. As you fly in, the roofs fade and every unit rises as a tower: its colour shows the lens and its height shows the size of the value.
- Controls: drag to pan, right-drag or Shift-drag to orbit and tilt, scroll to zoom. The compass resets to north.
- Clicking or searching flies the camera in. The 2D map remains one click away.

**Semantic zoom.** The opening view is the whole airfield, with every terminal zone, pier and car park shaded as one block by its total. Zooming in, or clicking a zone or tab, fades in the internal layout: units, holdrooms, gates and aircraft on stand. Tenant units use **generic
names** ("Coffee house · P1-03"), so no invented figures are attached to real brands.
Airport-run assets (lounges, car parks) use their public names. To pitch with real tenant
brands, edit the `Unit Name` and `Tenant` properties of the Unit list. The Frame code does not
change.

The page shows an "Illustrative data" badge, and the insights panel carries a note saying the
same.

## Files

| File | What it is |
|---|---|
| `src/frame.js` | **The Frame body.** Pure JavaScript (no libraries, no network), written to Pigment Frame rules, reading everything through `window.PigmentSDK`. Airport name, currency and area tabs are in the `CONFIG` and `SCOPE_LIST` constants at the top. Zoom boxes are computed from the data. |
| `src/mock-sdk.js` | Stand-in for `window.PigmentSDK` outside Pigment: the Manchester layout, a dummy passenger and commercial model, and recalculation after writes. Not used in Pigment. |
| `src/basemap-man.json` | Traced basemap paths, inlined at build time as `window.__MAN_BASEMAP`. In Pigment they become Map Feature items of type `base` with a `Path`. |
| `tools/trace_basemap.py` | Turns a map screenshot into basemap paths: `python3 tools/trace_basemap.py <png> src/basemap-man.json 3`. Needs `numpy`, `pillow`, `contourpy`. |
| `src/map3d.js` | The WebGL 3D renderer. `build.js` inlines it into the Frame; `dist/frame-body.js` is the complete Frame body to paste into Pigment. |
| `build.js` | `node build.js` writes `dist/airport-profit-map.html` (artifact page) and `dist/standalone.html` (open locally). |

## Stories built into the data

1. **Terminal 1 closure.** The budget assumed more of T1's passengers would move to T3 and its new extension than actually did. Use the *vs Budget* lens and press *Play 2026*: from March, T2 turns blue (about +11%) and T3 turns red (T3 extension about −30%). Turn on *Passenger flow* to see it at the gates.
2. **Pier 2 ramp-up.** The pier opened in 2025, and its units trail budget early in the year before catching up by summer. Open any Pier 2 unit and look at the monthly trend.
3. **Arrivals café · T2** is the clearest loss-maker: a big landside unit with low footfall and a lease ending March 2027. Re-let it live in the demo.
4. **Tech accessories · P1-08** trades below its minimum guarantee, so the airport is protected but the tenant is at risk.
5. **Profit pools.** The T2 walk-through duty free and Multi-Storey T2 lead on profit. On *Profit / m²*, the Skylink and Station screens top the table.
6. **Lease cluster.** Several Pier 1 leases end in 2027. Use the *Lease expiry* lens.

### Five-minute demo script

1. Open on the whole airfield: "This is Manchester, and every block is a revenue zone coloured by what it earns." Then click **Terminal 2**, and the map zooms in to show the internal layout.
2. Click **Terminal 3**. The headline figures now cover T3 only.
3. Switch to **vs Budget** and press **Play 2026**. After T1 closes in March, T3 goes red and T2 blue. Turn on **Passenger flow**.
4. Search **Arrivals café**. Read the generated explanation, profit bridge and trend.
5. Re-let it as **News & Convenience** and press **Apply**. "That wrote to Pigment, the model recalculated, and the map updated." Then press **Undo all**.

## Assets, capital projects and the story

**Click any component.** Terminals, piers, every aircraft stand, both runways, security, check-in, The Station, the Skylink, the hotels, the World Freight Terminal and the closed T1 are all clickable. Each opens an asset panel with:

- **Operations** (by type): passengers, aircraft movements, utilisation, availability, security queue performance, condition score.
- **P&L**: aeronautical, commercial and property revenue; staff, maintenance, utilities and other costs; EBITDA and margin; depreciation; operating profit; vs budget.
- A **monthly EBITDA trend** and the **capital projects** on that asset.
- Plain-English flags, for example "Availability 68%: out of service for the Pier 1 air-bridge replacement".

**Capital projects layer.** Toggle it with "Capital projects". Ten example schemes appear on the map as 3D construction volumes coloured by status. Live sites (In delivery) get a tower crane, and the runway scheme shows works markers along the runway. Stands under works show with no aircraft.

- **Filters:** project type, status, and a timeline slider ("On site now", any month 2025–2029, or ▶ to watch sites appear and finish).
- **Programme summary:** project count, forecast, spent, revenue at risk, a programme Gantt and the filtered list.
- **Project panel:** budget vs forecast vs spent, % complete, current phase, a phase Gantt with a "today" line, a cumulative spend S-curve (planned, actual, forecast), affected commercial units and revenue at risk, benefits, risks and sponsor.

**Tell the story.** A guided, eight-step tour that flies the camera and sets the lens, layers and selection for each step. Every number in the captions is calculated live from the data:

1. The airport at a glance.
2. Terminal 1 closes and passengers shift to T2.
3. T3 security is under pressure.
4. The T3 extension responds.
5. The Pier 1 works take stands out of action.
6. The arrivals café loses money, and the food-court refit fixes it.
7. The runway needs resurfacing.
8. The whole capital programme.

Use the arrow keys to step through and Esc to exit.

All asset, operational, financial and project data is **example data**. The projects are illustrative and are not Manchester Airports Group plans.

## Built in Pigment

The Frame is built in the Viridian workspace, in the app **MAG Commercial & Estate Map** (`0e387115-117c-4772-8f85-9e56f94f3c64`). Everything is in the `Commercial Map` folder. **Internal Viridian use only:** the basemap is traced from Google Maps and must not be shown or sent to MAG (see "Before going live").

Frame: `MAG Commercial & Estate Map` (`3acaf510-d692-4ca4-8af1-5b7b7baefa0a`). Its body is `dist/frame-body.min.js` (157 KB). It was pushed in 19,000-character chunks and read back byte for byte. To show it, add the Frame to a board in the Pigment UI; the board API cannot place Frames.

### Look and feel

The Frame shares the MAG Aviation Income route-network Frame's design language so the two read as one solution:

- the MAG logo, navy (`#012f60`) and sky (`#8fd0f2`) palette, and Inter type;
- light header and KPI cards over a dark navy map (`#011326`), with glass panels for the floating controls;
- amber (`#f59e0b`) for anything what-if, and amber dashed lines for budget.

### Lists

| List | Items | Notes |
|---|---|---|
| Month (calendar 2026) | 12 | Labels `Jan 26` … `Dec 26`. The Frame matches on the first three letters. |
| Terminal | 3 | T1, T2, T3 |
| Category | 15 | Conversion, Avg Ticket, Default Share, Cost Ratio, Operating Model, Group |
| Footfall Basis | 10 | Scope, Terminal, Share, Space Cost Rate |
| Gate | 32 | Terminal, Pier, Share of terminal departures |
| Unit | 97 | Display property `Code`. Name, tenant, terminal, zone, shape, lease, gate, category, area, MAG, footfall basis, exposure, trading and ticket factors, fixed cost |
| Asset | 43 | Runways, terminals, piers, stands, security, hotels, cargo, station |
| Asset Line / Asset Profile | 15 / 2 | P&L and KPI lines; Seasonal or Flat monthly phasing |
| Map Object | 180 | `F:` features, `A:` assets, `P:` projects; `Meta` holds JSON (Frames cannot read list properties) |

### Metrics

- **Inputs:** Terminal Departing Pax and Budget Terminal Departing Pax (Terminal × Month); Basis Ramp and Budget Basis Ramp (the Pier 2 ramp-up); Profile Weight; Asset Annual Value (Asset × Asset Line).
- **Passenger flow:** Basis Pax, Gate Departing Pax and Passengers Exposed, each with a Budget twin.
- **Unit P&L (Unit × Month):**
  - Transactions = passengers × conversion of the current category × trading factor.
  - Tenant Sales.
  - Concession Income, with a MAG floor for concessions.
  - Other Income (service charge £26/m²).
  - Direct Cost.
  - Allocated Cost (area × space-cost rate).
  - Airport Profit.
  - Budget Tenant Sales and Budget Profit, on the contracted category and rate.
- **What-if (writable sinks):** Unit Category (`sCategory`) and Revenue Share (`sRate`). Both are formula metrics with overrides on: a write from the map overrides the default, and clearing the override restores it.
- **Frame helpers:** Unit Meta (pipe-delimited text), Unit Area, Unit MAG and Object Meta.

Pigment matches `src/mock-sdk.js` exactly: YTD Oct profit £171.9M, budget £166.9M, tenant sales £483.7M.

Watch out: in Pigment formulas, wrap both sides of a `>` comparison in brackets (`(a / 12) > (b * c)`). Without them the comparison binds before `*` and the formula fails to compile.

### Frame data sources

| Source | Labels | Values |
|---|---|---|
| `objects` | Map Object | Object Meta |
| `unitInputs` | Unit | Unit Meta, Revenue Share, Unit Category, Unit Area, Unit MAG |
| `unitMonthly` | Unit, Month | Tenant Sales, Concession Income, Other Income, Direct Cost, Allocated Cost, Airport Profit, Budget Profit, Transactions, Passengers Exposed, Budget Passengers Exposed |
| `gateMonthly` | Gate, Month | Gate Departing Pax, Budget Gate Departing Pax |
| `assetAnnual` | Asset, Asset Line | Asset Annual Value |
| `profiles` | Asset Profile, Month | Profile Weight |

The sinks are `sRate` (Revenue Share) and `sCategory` (Unit Category). Both are keyed `{ unitList: <unit code> }`.

### Rebuilding

```bash
node tools/export_pigment.js      # mock engine -> dist/pigment-load.json, prints the YTD check
TERSER_PATH=/path/to/terser node build.js
```

To push a new body, replace the Frame body in chunks of at most 20,000 characters with `update_frame_body`. Then read it back with `search_frames` and diff it against `dist/frame-body.min.js`.

### Before going live

- Point what-if write-back at a scenario or sandbox version.
- `MONTHS` and `LAST_ACTUAL` are constants at the top of `frame.js`. Drive them from the Month list when the period rolls forward.
- **Basemap licensing.** The current basemap is traced from a Google Maps screenshot. That is fine for an internal concept, but Google's terms restrict derived map data. For anything shown to a customer or published, retrace from OpenStreetMap (ODbL, with "© OpenStreetMap contributors" attribution) or from the airport's own GIS. The colour rules in `trace_basemap.py` will need adjusting for a different map style.
- For a customer-ready interior, replace the schematic terminal geometry with coordinates from Manchester's own CAD or GIS floor plans. The `Shape` values in Map Object Meta take them directly.

## Sources for the public facts

- 2025 passengers: [CAPA](https://centreforaviation.com/news/manchester-airport-handles-record-321m-pax-in-2025-1344609), [Marketing Stockport](https://marketingstockport.co.uk/news/manchester-airport-records-32-million-passengers-in-2025/)
- Terminal 1 closure and T3: [Travel Radar](https://travelradar.aero/manchester-airport-closes-terminal-1-after-60-years/), [CAPA](https://centreforaviation.com/news/manchester-airport-reports-record-feb-2026-amid-new-status-as-two-terminal-facility-1351534)
- Piers 1 and 2: [ADS Group](https://www.adsgroup.org.uk/knowledge/industry-member-news/manchester-airport-s-new-pier-completes-first-phase-of-pound-1bn-transformation/), [Construction Index](https://www.theconstructionindex.co.uk/news/view/mace-breaks-ground-on-mags-pier-2)
- T2 retail and the duty free size: [Moodie Davitt](https://moodiedavittreport.com/22-new-retail-and-fb-stores-to-complete-manchester-airport-t2-transformation-in-2025/), [Business Traveller](https://www.businesstraveller.com/business-travel/2024/09/21/manchester-airport-unveils-line-up-of-shops-bars-and-restaurants-for-terminal-2/)
- Runways: [OurAirports](https://ourairports.com/airports/EGCC/runways.html)
- Car parks: [Confidentials](https://confidentials.com/manchester/quick-guide-to-official-parking-at-manchester-airport)

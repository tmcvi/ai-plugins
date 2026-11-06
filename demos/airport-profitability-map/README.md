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

## Moving it into Pigment

### Lists

**Unit.** The item name is the unit code (for example `T2-P1-03`). Properties:

- `Unit Name`, `Tenant` and `Category`. `Tenant` and `Category` are writable for re-letting.
- `Terminal`: `T2`, `T3`, `Landside` or `Ground`.
- `Zone`, `Area (m²)` and `Operating Model`.
- `Shape`: `x,y,w,h` in a 1600×1000 map space.
- `Lease Expiry`, `MAG (£/yr)` and `Nearest Gate`.

**Map Feature.** Background geometry. Properties: `Type`, `Shape`, `Label`, `Sub`, `LabelX`, `LabelY`, `Terminal`, `Zone`, `Pier`, `Heading`, `Ends`, `Closed`.

`Type` is one of `base` (with `Class` and `Path`), `runwayline` (with `Line`), `place`, `roadlabel`, `poi`, `walkway`, `station`, `terminal`, `closed`, `zone`, `pier`, `ghostpier`, `security`, `checkin`, `holdroom`, `stand`, `gate` or `compass`.

**Month** (Jan–Dec 2026) and **Gate**.

### Metrics

By Unit × Month × Version (Actual, Budget):

- Drivers: Passengers Exposed, Conversion, Average Ticket, Revenue Share (by Unit only, writable), and Space Cost Rate by zone.
- Calculated: Tenant Sales, Concession Income (`MAX(MAG / 12, Revenue Share × Sales)`), Other Income, Direct Cost, Allocated Cost, Airport Profit, Budget Profit and Transactions.
- By Gate × Month: Departing Pax and Budget Departing Pax.

`calc()` in `src/mock-sdk.js` is a working reference for this logic.

### Views

| Alias | Rows | Columns | Page |
|---|---|---|---|
| `unitKpis` | Unit | Tenant Sales, Concession Income, Other Income, Direct Cost, Allocated Cost, Airport Profit, Budget Profit, Transactions, Passengers Exposed, Budget Passengers Exposed, Revenue Share | `months` (multi-select) |
| `unitTrend` | Month | Airport Profit, Budget Profit, Tenant Sales, Transactions | `units` (one unit) |
| `gatePax` | Gate | Departing Pax, Budget Departing Pax | `months` |

### Frame bindings

```json
[
  { "type": "List",   "alias": "units",        "list_id": "<Unit>",        "can_read": true, "can_write": true },
  { "type": "List",   "alias": "features",     "list_id": "<Map Feature>", "can_read": true },
  { "type": "List",   "alias": "months",       "list_id": "<Month>" },
  { "type": "View",   "alias": "unitKpis",     "view_id": "<view>",        "can_read": true },
  { "type": "View",   "alias": "unitTrend",    "view_id": "<view>",        "can_read": true },
  { "type": "View",   "alias": "gatePax",      "view_id": "<view>",        "can_read": true },
  { "type": "Metric", "alias": "revenueShare", "metric_id": "<metric>",    "can_write": true }
]
```

### Before going live

- Point what-if write-back at a scenario or sandbox version.
- `MONTHS` and `LAST_ACTUAL` are constants at the top of `frame.js`. Drive them from the Month list when the period rolls forward.
- Confirm that `prop()` matches the real `subscribeToItems` item shape.
- **Basemap licensing.** The current basemap is traced from a Google Maps screenshot. That is fine for an internal concept, but Google's terms restrict derived map data. For anything shown to a customer or published, retrace from OpenStreetMap (ODbL, with "© OpenStreetMap contributors" attribution) or from the airport's own GIS. The colour rules in `trace_basemap.py` will need adjusting for a different map style.
- For a customer-ready interior, replace the schematic terminal geometry with coordinates from Manchester's own CAD or GIS floor plans. The `Shape` columns take them directly.

## Sources for the public facts

- 2025 passengers: [CAPA](https://centreforaviation.com/news/manchester-airport-handles-record-321m-pax-in-2025-1344609), [Marketing Stockport](https://marketingstockport.co.uk/news/manchester-airport-records-32-million-passengers-in-2025/)
- Terminal 1 closure and T3: [Travel Radar](https://travelradar.aero/manchester-airport-closes-terminal-1-after-60-years/), [CAPA](https://centreforaviation.com/news/manchester-airport-reports-record-feb-2026-amid-new-status-as-two-terminal-facility-1351534)
- Piers 1 and 2: [ADS Group](https://www.adsgroup.org.uk/knowledge/industry-member-news/manchester-airport-s-new-pier-completes-first-phase-of-pound-1bn-transformation/), [Construction Index](https://www.theconstructionindex.co.uk/news/view/mace-breaks-ground-on-mags-pier-2)
- T2 retail and the duty free size: [Moodie Davitt](https://moodiedavittreport.com/22-new-retail-and-fb-stores-to-complete-manchester-airport-t2-transformation-in-2025/), [Business Traveller](https://www.businesstraveller.com/business-travel/2024/09/21/manchester-airport-unveils-line-up-of-shops-bars-and-restaurants-for-terminal-2/)
- Runways: [OurAirports](https://ourairports.com/airports/EGCC/runways.html)
- Car parks: [Confidentials](https://confidentials.com/manchester/quick-guide-to-official-parking-at-manchester-airport)

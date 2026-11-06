# Airport Profitability Map — Pigment Frame prototype

An interactive floor plan of a fictional airport, **Aurora International**. Each commercial unit is
coloured by how much profit it makes for the airport. Viewers can drill from the airport to a
terminal, a pier and a single unit, then run what-if changes that write back to Pigment and
recalculate the whole map.

All data is dummy data. The airport, tenants and brands are invented.

## Files

| File | What it is |
|---|---|
| `src/frame.js` | **The Frame body.** Pure JavaScript (no libraries, no network), written to Pigment Frame rules. It reads everything through `window.PigmentSDK`. Paste it into Pigment as-is. |
| `src/mock-sdk.js` | Stand-in for `window.PigmentSDK` outside Pigment: same aliases, same data shapes and loading states, and it recalculates after writes. Not used in Pigment. |
| `build.js` | `node build.js` inlines both into `dist/airport-profit-map.html` (artifact page) and `dist/standalone.html` (open locally in a browser). |

## What it shows

- **Six lenses:** Profit, Profit per m², Retail spend per passenger, Variance to budget, Lease expiry, Category.
- **Drill path:** airport → terminal → pier or zone → unit. Click a zone or use the tabs; the KPI strip and insights follow the drill.
- **Unit panel:** a profit bridge (income, service charge, direct cost, space cost), trading KPIs, a 2026 monthly trend against budget, and plain-English explanations generated from the data.
- **What-if write-back:** change a unit's revenue share or re-let it as another category. The Frame calls `editValue` / `editItem`, Pigment recalculates, and the map recolours. "Undo all" writes the original values back.
- **Time playback:** steps month by month through 2026 actuals.
- **Passenger flow overlay:** footfall from security to each pier, with gate pax against budget.

### Stories planted in the dummy data

1. **Pier B gate reallocation.** From May 2026, gates B1–B5 lose 62% of their flights to Pier C, and the budget did not plan for it. Use the *vs Budget* lens and press *Play*: T1 turns red and T2 turns blue. The insight panel shows the cost by zone.
2. **Arrivals Coffee House (T1 landside)** is the clearest loss-maker: a large unit in a dead corner with a lease ending in Jan 2027. Re-let it as News & Convenience and watch the profit change.
3. **Volt Electronics (T2 airside)** trades below its minimum guarantee, so the airport is protected but the tenant is at risk.
4. **Duty free and car parks** are the profit pools. On the *Profit / m²* lens, the advertising screens in the airside link turn out to be the densest earners.
5. **Pier C leases** cluster in the next 12 months, so the *Lease expiry* lens shows revenue at risk.

### Five-minute demo script

1. Open on *Profit*. "This is every commercial unit in the airport, coloured by profit." Hover a few units.
2. Click **Terminal 1**, then **Pier B**. The KPI strip now covers Pier B only.
3. Switch to **vs Budget** and press **Play 2026**. From May, the pier turns red. Turn on **Passenger flow** to show why.
4. Search for **Arrivals Coffee House**. Read the auto-generated explanation, the profit bridge and the trend.
5. Re-let it as **News & Convenience** and press **Apply**. "That just wrote to Pigment. The model recalculated, and the map, KPIs and insights updated." Then press **Undo all**.

## Moving it into Pigment

### Lists

**Unit** (one item per commercial unit). The item name is the unit code, for example `T1-B-03`.

| Property | Type | Notes |
|---|---|---|
| Unit Name | Text | Display name |
| Tenant | Text | Writable by the Frame (re-let) |
| Category | Text or dimension | Writable by the Frame (re-let) |
| Terminal | Text | `T1`, `T2`, `Link`, `Ground` |
| Zone | Text | `Pier A`, `T1 Airside`, `T1 Landside`, `Airside Link`, `Car Parks & Ground`... |
| Area (m²) | Number | |
| Operating Model | Text | `Concession`, `Airport-operated`, `Media` |
| Shape | Text | `x,y,w,h` in a 1600×1000 map space. **The floor plan is data.** |
| Lease Expiry | Date | |
| MAG (€/yr) | Number | Minimum annual guarantee |
| Nearest Gate | Text | |

**Map Feature** (background geometry: runway, apron, terminals, piers, security, check-in, holdrooms,
gates, stands, roads). Properties: `Type`, `Shape`, `Label`, `Terminal`, `Zone`, `Pier`, `Heading`.
Swap these two lists and the same Frame draws a different airport, a shopping centre, a stadium
or a hospital estate.

**Month** (Jan–Dec 2026) and **Gate**.

### Metrics

By Unit × Month × Version (Actual, Budget):

- Inputs and drivers: Passengers Exposed, Conversion, Average Ticket, Revenue Share (Unit only, writable), Space Cost Rate by zone.
- Calculated: Tenant Sales, Concession Income (`MAX(MAG / 12, Revenue Share × Sales)`), Other Income, Direct Cost, Allocated Cost, Airport Profit, Budget Profit, Transactions.
- Departing Pax and Budget Departing Pax by Gate × Month.

`src/mock-sdk.js` (`calc()`) is a working reference for this logic.

### Views

| Alias | Source | Rows | Columns | Page |
|---|---|---|---|---|
| `unitKpis` | KPI metrics | Unit | Tenant Sales, Concession Income, Other Income, Direct Cost, Allocated Cost, Airport Profit, Budget Profit, Transactions, Passengers Exposed, Budget Passengers Exposed, Revenue Share | `months` (multi-select) |
| `unitTrend` | Same metrics | Month | Airport Profit, Budget Profit, Tenant Sales, Transactions | `units` (one unit) |
| `gatePax` | Gate pax | Gate | Departing Pax, Budget Departing Pax | `months` |

The Frame looks up columns by name, so column order does not matter.

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

### Before going live, check

- **Scenario-safe write-back:** what-if writes change the model, so point the Frame at a scenario or a sandbox version.
- **Month constants:** `MONTHS` and `LAST_ACTUAL` are constants at the top of `frame.js`. Drive them from the Month list if the period rolls forward.
- **Item shape:** the Frame reads properties by friendly name through `prop()`, which accepts flat or nested item shapes. Confirm this against the real `subscribeToItems` payload.

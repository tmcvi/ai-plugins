#!/usr/bin/env python3
"""
Niguri Honda demo — data generator (Phase 2b of the build plan).

Seeded, deterministic. Produces the 7 CSV files consumed by the Pigment model
at exactly the grains specified in the build plan. Every actuals file is a VIEW
over a single simulated slice universe, so production -> allocation -> shipping
-> registration reconcile through the cohort chain with no seams (the plan's
non-negotiable "consistency rule").

Run:  python3 generate.py
Output: ./data/*.csv  and  ./data/QA_REPORT.txt

Time model
----------
W0 = the week of the demo anchor date (Mon 2026-08-10) on the native Week
calendar. Weeks are signed offsets from W0 (W-26 .. W+52). "production_week" and
"calendar_week" columns are these offsets; every file also carries the Monday
week_start_date so imports can map cleanly onto the native Week calendar.

Cohort = Model x Production Week. Journey is pure offsets on the calendar (no
loops, no recursion): the same acyclic logic the Pigment L1-L4 layers rebuild.

Actuals frontiers emerge from the simulation, not hard-coded cut-offs:
  - production firm to W+8, planned after
  - allocation sealed for cohorts up to W+8
  - shipments to ~W+3 (booked vessels)
  - registrations to W-1 (last completed sale week)
"""

import csv
import datetime as dt
import os
import random
from collections import defaultdict

# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

SEED = 20260810
ANCHOR = dt.date(2026, 8, 10)  # Monday of W0 on the native Week calendar

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# Export horizon (production_plan / demand_track): W-26 .. W+51 = 78 weeks.
EXPORT_FIRST, EXPORT_LAST = -26, 51
# Warm-up cohorts simulated only to source ~6 months of registration history;
# not exported in production_plan (keeps it at the planned 5 x 78 = 390 grain).
WARMUP_FIRST = -45

# Actuals frontiers.
PROD_FIRM_LAST = 8          # W+1..W+8 firm, W+9.. planned
ALLOC_FRONTIER = 8          # cohorts sealed through W+8
SHIP_FRONTIER = 3           # ship events actual through ~W+3
REG_FRONTIER = -1           # registrations actual through W-1

MODELS = ["Civic", "CR-V", "HR-V", "Jazz", "e:Ny1"]
MARKETS = ["UK", "Germany", "France", "Italy", "Spain",
           "Netherlands", "Belgium", "Poland", "Nordics", "Portugal"]

# --- Volume model ---------------------------------------------------------- #
BASE_WEEKLY = 2250          # units/week before seasonality
WEEKLY_FLOOR, WEEKLY_CEIL = 1800, 2600

# Model mix. e:Ny1 raw weight ramps over the horizon (small & growing); the
# others' shares fall out by renormalisation.
MODEL_RAW = {"Civic": 30.0, "CR-V": 30.0, "HR-V": 15.0, "Jazz": 18.0}
ENY1_RAW_START, ENY1_RAW_END = 3.0, 16.0

# Production seasonality by calendar month (December dip, summer softening).
MONTH_MULT = {1: 0.92, 2: 0.98, 3: 1.05, 4: 1.02, 5: 1.00, 6: 1.00,
              7: 0.95, 8: 0.88, 9: 1.08, 10: 1.05, 11: 1.02, 12: 0.80}

# --- Market demand mix ----------------------------------------------------- #
MARKET_SHARE = {"UK": 0.24, "Germany": 0.19, "France": 0.14, "Italy": 0.09,
                "Spain": 0.08, "Netherlands": 0.06, "Belgium": 0.05,
                "Poland": 0.045, "Nordics": 0.06, "Portugal": 0.045}

# e:Ny1 (EV) sold only in EV-forward markets -> natural sparsity for that model.
ENY1_MARKETS = {"UK", "Germany", "France", "Netherlands", "Nordics", "Belgium"}

# UK plate-change registration spikes (March & September).
UK_SPIKE_MONTHS = {3: 1.40, 9: 1.45}

# --- Lead-time assumptions (weeks) ----------------------------------------- #
# prod -> ship, per model.
SHIP_OFFSET = {"Civic": 1, "CR-V": 1, "HR-V": 2, "Jazz": 2, "e:Ny1": 2}

# Transit, per market. North-EU faster than South-EU; the ordering is the
# realistic invariant. Absolute values are compressed from the plan's
# 8-9 / 10-12 note so the hero Civic W+6 cohort sells in Germany in November
# and Portugal in January per the locked click-path (see QA report / README).
# Portugal held at 12 so the scripted 12 -> 10 edit lands (both stay January).
TRANSIT = {"UK": 4, "Germany": 5, "France": 6, "Netherlands": 5, "Belgium": 6,
           "Nordics": 7, "Poland": 7, "Spain": 9, "Italy": 10, "Portugal": 12}

# Arrival -> stock (inbound handling / customs), per market.
INBOUND = {"UK": 1, "Germany": 1, "France": 1, "Netherlands": 1, "Belgium": 1,
           "Nordics": 1, "Poland": 1, "Spain": 2, "Italy": 2, "Portugal": 2}

# Sell-through spread from stock week, weights over offsets +2/+3/+4.
SELL_OFFSETS = [2, 3, 4]
SELL_DEFAULT = [0.40, 0.40, 0.20]
SELL_SOUTH = [0.30, 0.40, 0.30]   # South-EU sells a touch more spread out
SOUTH_MARKETS = {"Spain", "Italy", "Portugal"}

# --- Allocation policy ----------------------------------------------------- #
PRIORITY = {m: 1.0 for m in MARKETS}
MIN_PCT = {m: 0.0 for m in MARKETS}
MIN_PCT["Portugal"] = 0.02        # the two small floored markets
MIN_PCT["Poland"] = 0.03
TARGET_COVER_WEEKS = 8

# Historical seals are batched: dominant markets take a slice every week, mid
# and small markets ship in less frequent, larger batches (staggered by phase),
# so not every model ships to every market every week — realistic, and it keeps
# the sealed-slice count in the plan's band. Every market still recurs across
# the horizon. Cadence in weeks between shipments per market.
CADENCE = {"UK": 1, "Germany": 1, "France": 1,
           "Italy": 2, "Spain": 2, "Netherlands": 2, "Belgium": 2, "Nordics": 2,
           "Poland": 3, "Portugal": 3}

VESSELS = ["MV Sakura", "MV Kanto", "MV Setouchi", "MV Tokaido", "MV Sendai",
           "MV Kyushu", "MV Aomori", "MV Nagano", "MV Iwate", "MV Suzuka"]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def week_start(offset: int) -> dt.date:
    return ANCHOR + dt.timedelta(weeks=offset)


def month_of(offset: int) -> int:
    return week_start(offset).month


def largest_remainder(total: int, weights: dict) -> dict:
    """Split integer `total` across keys by `weights`, summing to exactly total."""
    total = int(round(total))
    keys = [k for k, w in weights.items() if w > 0]
    if total <= 0 or not keys:
        return {}
    wsum = sum(weights[k] for k in keys)
    exact = {k: total * weights[k] / wsum for k in keys}
    floor = {k: int(v) for k, v in exact.items()}
    remainder = total - sum(floor.values())
    # Hand out the leftover units to the largest fractional parts.
    order = sorted(keys, key=lambda k: exact[k] - floor[k], reverse=True)
    for i in range(remainder):
        floor[order[i % len(order)]] += 1
    return {k: v for k, v in floor.items() if v > 0}


# --------------------------------------------------------------------------- #
# Volume + demand models
# --------------------------------------------------------------------------- #

def model_shares(offset: int) -> dict:
    """Model mix for a given week, with e:Ny1 ramping over the horizon."""
    frac = (offset - WARMUP_FIRST) / (EXPORT_LAST - WARMUP_FIRST)
    frac = min(1.0, max(0.0, frac))
    eny1 = ENY1_RAW_START + frac * (ENY1_RAW_END - ENY1_RAW_START)
    raw = dict(MODEL_RAW)
    raw["e:Ny1"] = eny1
    tot = sum(raw.values())
    return {m: raw[m] / tot for m in MODELS}


def weekly_total(offset: int, rng: random.Random) -> int:
    mult = MONTH_MULT[month_of(offset)]
    wiggle = 1.0 + rng.uniform(-0.03, 0.03)
    val = BASE_WEEKLY * mult * wiggle
    return int(round(min(WEEKLY_CEIL, max(WEEKLY_FLOOR, val))))


def production_units(offset: int, rng: random.Random) -> dict:
    """Units per model for a production week."""
    total = weekly_total(offset, rng)
    return largest_remainder(total, model_shares(offset))


def market_share_for(model: str) -> dict:
    """Market demand mix for a model (e:Ny1 restricted to EV markets)."""
    if model == "e:Ny1":
        base = {mk: MARKET_SHARE[mk] for mk in MARKETS if mk in ENY1_MARKETS}
    else:
        base = dict(MARKET_SHARE)
    tot = sum(base.values())
    return {mk: base[mk] / tot for mk in base}


def demand_units(model: str, market: str, offset: int) -> float:
    """Steady weekly demand rate with UK plate-change spikes."""
    shares = market_share_for(model)
    if market not in shares:
        return 0.0
    ms = model_shares(offset)
    base = BASE_WEEKLY * ms[model] * shares[market]
    if market == "UK" and month_of(offset) in UK_SPIKE_MONTHS:
        base *= UK_SPIKE_MONTHS[month_of(offset)]
    return base


# --------------------------------------------------------------------------- #
# Allocation (historical seals: demand-proportional, concentrated, floored)
# --------------------------------------------------------------------------- #

def _ships_this_week(market: str, offset: int) -> bool:
    c = CADENCE[market]
    phase = MARKETS.index(market) % c   # deterministic stagger
    return (offset - phase) % c == 0


def allocate_cohort(model: str, offset: int, units: int) -> dict:
    """Split a cohort's units across the markets shipping this week.

    Conservation: sum == units. A batched market's slice carries roughly
    `cadence` weeks of its demand (weight = share x cadence), so its average
    weekly rate still tracks demand.
    """
    shares = market_share_for(model)
    if not shares or units <= 0:
        return {}
    active = {mk: shares[mk] * CADENCE[mk]
              for mk in shares if _ships_this_week(mk, offset)}
    if not active:  # safety: fall back to dominant markets
        active = {mk: shares[mk] for mk in shares if CADENCE[mk] == 1}
    return largest_remainder(units, active)


# --------------------------------------------------------------------------- #
# Journey phasing (pure offsets)
# --------------------------------------------------------------------------- #

def sell_weights(market: str) -> dict:
    spread = SELL_SOUTH if market in SOUTH_MARKETS else SELL_DEFAULT
    return {off: w for off, w in zip(SELL_OFFSETS, spread)}


def journey(model: str, prod_week: int, market: str, units: int) -> dict:
    ship_week = prod_week + SHIP_OFFSET[model]
    arrival_week = ship_week + TRANSIT[market]
    stock_week = arrival_week + INBOUND[market]
    sales = largest_remainder(units, sell_weights(market))  # keyed by offset
    sale_by_week = {stock_week + off: u for off, u in sales.items()}
    return {
        "ship_week": ship_week,
        "arrival_week": arrival_week,
        "stock_week": stock_week,
        "sale_by_week": sale_by_week,
    }


# --------------------------------------------------------------------------- #
# Simulate the slice universe
# --------------------------------------------------------------------------- #

def simulate():
    rng = random.Random(SEED)
    production = {}   # (model, prod_week) -> units      (WARMUP_FIRST..EXPORT_LAST)
    slices = []       # one per (model, prod_week, market) with journey

    for w in range(WARMUP_FIRST, EXPORT_LAST + 1):
        units_by_model = production_units(w, rng)
        for model in MODELS:
            p = units_by_model.get(model, 0)
            production[(model, w)] = p
            if p <= 0:
                continue
            alloc = allocate_cohort(model, w, p)
            assert sum(alloc.values()) == p, \
                f"conservation broke: {model} W{w} {sum(alloc.values())} != {p}"
            for market, u in alloc.items():
                j = journey(model, w, market, u)
                slices.append({
                    "model": model, "prod_week": w, "market": market,
                    "units": u, **j,
                })
    return production, slices


# --------------------------------------------------------------------------- #
# Writers
# --------------------------------------------------------------------------- #

def _w(name, header, rows):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(header)
        wr.writerows(rows)
    return len(rows)


def write_production_plan(production):
    rows = []
    for w in range(EXPORT_FIRST, EXPORT_LAST + 1):
        status = ("actual" if w <= 0 else
                  "firm" if w <= PROD_FIRM_LAST else "planned")
        for model in MODELS:
            rows.append([model, w, week_start(w).isoformat(), status,
                         production[(model, w)]])
    rows.sort(key=lambda r: (r[1], MODELS.index(r[0])))
    return _w("production_plan.csv",
              ["model", "production_week", "week_start_date", "status", "units"],
              rows)


def write_allocation_actuals(slices):
    agg = defaultdict(int)
    for s in slices:
        if EXPORT_FIRST <= s["prod_week"] <= ALLOC_FRONTIER:
            agg[(s["model"], s["prod_week"], s["market"])] += s["units"]
    rows = [[m, w, mk, u] for (m, w, mk), u in agg.items()]
    rows.sort(key=lambda r: (r[1], MODELS.index(r[0]), MARKETS.index(r[2])))
    return _w("allocation_actuals.csv",
              ["model", "production_week", "market", "units"], rows)


def write_floating_shipments(slices):
    rows = []
    seq = 0
    ship = [s for s in slices if s["ship_week"] <= SHIP_FRONTIER
            and s["prod_week"] >= EXPORT_FIRST]
    ship.sort(key=lambda s: (s["ship_week"], s["prod_week"],
                             MODELS.index(s["model"]), MARKETS.index(s["market"])))
    for s in ship:
        vessel = f"{VESSELS[seq % len(VESSELS)]} / V{2600 + seq}"
        seq += 1
        rows.append([s["model"], s["prod_week"], s["market"], s["ship_week"],
                     week_start(s["ship_week"]).isoformat(), s["units"], vessel])
    return _w("floating_shipments.csv",
              ["model", "production_week", "market", "ship_week",
               "ship_date", "units", "vessel_ref"], rows)


def write_registrations_actuals(slices):
    agg = defaultdict(int)
    for s in slices:
        for sale_week, u in s["sale_by_week"].items():
            if EXPORT_FIRST <= sale_week <= REG_FRONTIER:
                agg[(s["model"], s["market"], sale_week)] += u
    rows = [[m, mk, cw, week_start(cw).isoformat(), u]
            for (m, mk, cw), u in agg.items()]
    rows.sort(key=lambda r: (r[2], MODELS.index(r[0]), MARKETS.index(r[1])))
    return _w("registrations_actuals.csv",
              ["model", "market", "calendar_week", "week_start_date", "units"],
              rows)


def write_lead_times():
    rows = []
    for model in MODELS:
        rows.append(["prod_to_ship", model, "", "", SHIP_OFFSET[model]])
    for mk in MARKETS:
        rows.append(["transit", "", mk, "", TRANSIT[mk]])
    for mk in MARKETS:
        rows.append(["inbound_lag", "", mk, "", INBOUND[mk]])
    for mk in MARKETS:
        w = sell_weights(mk)
        for off in SELL_OFFSETS:
            rows.append(["sell_through", "", mk, off, round(w[off], 3)])
    return _w("lead_times.csv",
              ["assumption_type", "model", "market", "offset_week", "value"],
              rows)


def write_demand_track():
    rows = []
    for w in range(EXPORT_FIRST, EXPORT_LAST + 1):
        for model in MODELS:
            for mk in MARKETS:
                d = demand_units(model, mk, w)
                rows.append([model, mk, w, week_start(w).isoformat(),
                             int(round(d))])
    rows.sort(key=lambda r: (r[2], MODELS.index(r[0]), MARKETS.index(r[1])))
    return _w("demand_track.csv",
              ["model", "market", "calendar_week", "week_start_date",
               "demand_units"], rows)


def write_allocation_policy():
    rows = []
    for mk in MARKETS:
        rows.append(["market", mk, round(PRIORITY[mk], 2),
                     round(MIN_PCT[mk], 3), ""])
    rows.append(["global", "", "", "", TARGET_COVER_WEEKS])
    return _w("allocation_policy.csv",
              ["scope", "market", "priority_weight", "min_pct",
               "target_cover_weeks"], rows)


# --------------------------------------------------------------------------- #
# QA
# --------------------------------------------------------------------------- #

def qa(production, slices, counts):
    lines = []
    def p(s=""):
        lines.append(s)

    p("NIGURI HONDA — DATA GENERATOR QA REPORT")
    p(f"seed={SEED}  anchor(W0)={ANCHOR.isoformat()} (Mon)")
    p("=" * 64)
    p()
    p("Row counts vs build-plan spec")
    spec = {
        "production_plan.csv": "~390",
        "allocation_actuals.csv": "900-1,200",
        "floating_shipments.csv": "800-1,100",
        "registrations_actuals.csv": "1,000-1,300",
        "lead_times.csv": "~55",
        "demand_track.csv": "~3,900",
        "allocation_policy.csv": "11",
    }
    for name, n in counts.items():
        p(f"  {name:<28} {n:>6}   (spec {spec[name]})")
    p()

    # Conservation on every exported/sealed cohort.
    bad = 0
    for (model, w), p_units in production.items():
        if not (EXPORT_FIRST <= w <= ALLOC_FRONTIER):
            continue
        s_units = sum(s["units"] for s in slices
                      if s["model"] == model and s["prod_week"] == w)
        if s_units != p_units:
            bad += 1
    p(f"Conservation (sealed cohorts W-26..W+8): "
      f"{'PASS — every cohort sum(slices)==production' if bad == 0 else f'FAIL ({bad})'}")
    p()

    # Weekly production totals stay in band.
    wk_tot = defaultdict(int)
    for (model, w), u in production.items():
        if EXPORT_FIRST <= w <= EXPORT_LAST:
            wk_tot[w] += u
    lo, hi = min(wk_tot.values()), max(wk_tot.values())
    p(f"Weekly production totals: min={lo}  max={hi}  "
      f"(band {WEEKLY_FLOOR}-{WEEKLY_CEIL}) -> "
      f"{'in band' if lo >= WEEKLY_FLOOR and hi <= WEEKLY_CEIL else 'OUT OF BAND'}")
    p()

    # Hero cohort trace: Civic W+6.
    p("Hero cohort trace — Civic, Production Week W+6")
    hero = [s for s in slices if s["model"] == "Civic" and s["prod_week"] == 6]
    hero.sort(key=lambda s: MARKETS.index(s["market"]))
    total = sum(s["units"] for s in hero)
    p(f"  produced W+6 ({week_start(6).isoformat()}), {total} units, "
      f"{len(hero)} market slices")
    for s in hero:
        peak = max(s["sale_by_week"], key=lambda k: s["sale_by_week"][k])
        p(f"    {s['market']:<12} {s['units']:>4}u  ship W+{s['ship_week']}"
          f" -> arr W+{s['arrival_week']} -> stock W+{s['stock_week']}"
          f" -> peak sale W+{peak} ({week_start(peak).strftime('%b %d %Y')})")
    de = next((s for s in hero if s["market"] == "Germany"), None)
    pt = next((s for s in hero if s["market"] == "Portugal"), None)
    if de and pt:
        de_pk = max(de["sale_by_week"], key=lambda k: de["sale_by_week"][k])
        pt_pk = max(pt["sale_by_week"], key=lambda k: pt["sale_by_week"][k])
        p()
        p(f"  Narrative check: Germany peak sale {week_start(de_pk).strftime('%B')}"
          f" / Portugal peak sale {week_start(pt_pk).strftime('%B')}"
          f"  ({'OK' if week_start(de_pk).month == 11 and week_start(pt_pk).month == 1 else 'CHECK'})")
    p()

    # Frontiers actually observed in the exported actuals.
    reg_weeks = sorted({s_week for s in slices for s_week in s["sale_by_week"]
                        if EXPORT_FIRST <= s_week <= REG_FRONTIER})
    ship_weeks = sorted({s["ship_week"] for s in slices
                         if s["ship_week"] <= SHIP_FRONTIER
                         and s["prod_week"] >= EXPORT_FIRST})
    p("Observed actuals frontiers")
    p(f"  registrations: W{reg_weeks[0]} .. W{reg_weeks[-1]}  (frontier W-1)")
    p(f"  shipments:     W{ship_weeks[0]} .. W+{ship_weeks[-1]}  (frontier ~W+3)")
    p(f"  production firm through W+{PROD_FIRM_LAST}, planned after")
    p()

    report = "\n".join(lines)
    with open(os.path.join(OUT_DIR, "QA_REPORT.txt"), "w") as f:
        f.write(report + "\n")
    return report, (bad == 0 and lo >= WEEKLY_FLOOR and hi <= WEEKLY_CEIL)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    production, slices = simulate()

    counts = {}
    counts["production_plan.csv"] = write_production_plan(production)
    counts["allocation_actuals.csv"] = write_allocation_actuals(slices)
    counts["floating_shipments.csv"] = write_floating_shipments(slices)
    counts["registrations_actuals.csv"] = write_registrations_actuals(slices)
    counts["lead_times.csv"] = write_lead_times()
    counts["demand_track.csv"] = write_demand_track()
    counts["allocation_policy.csv"] = write_allocation_policy()

    report, ok = qa(production, slices, counts)
    print(report)
    print("data written to", OUT_DIR)
    print("QA:", "PASS" if ok else "REVIEW")


if __name__ == "__main__":
    main()

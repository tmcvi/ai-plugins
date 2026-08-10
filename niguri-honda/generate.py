#!/usr/bin/env python3
"""
Niguri Honda demo — data generator (Phase 2b of the build plan).

Seeded, deterministic. Produces the 7 CSV files consumed by the Pigment model
at the grains specified in the build plan. Every actuals file is a VIEW over a
single simulated slice universe, so production -> allocation -> shipping ->
registration reconcile through the cohort chain with no seams (the plan's
non-negotiable "consistency rule").

Drive-hand model (added per demo decision):
  - Model is drive-hand specific: 5 base models x {LHD, RHD} = 10 variants.
  - Markets carry a drive hand; UK + Ireland are RHD, the other 9 are LHD.
  - A model variant can ONLY be allocated to markets of the same drive hand
    (RHD Civics cannot be sold in Germany). Production of each base model is
    split LHD/RHD in proportion to the demand mass of its drive-hand markets.

Run:  python3 generate.py
Output: ./data/*.csv  and  ./data/QA_REPORT.txt

Time model
----------
W0 = the week of the demo anchor date (Mon 2026-08-10) on the native Week
calendar. Weeks are signed offsets from W0. "production_week"/"calendar_week"
columns are these offsets; every file also carries the Monday week_start_date
so imports map cleanly onto the native Week calendar. Cohort = Model x
Production Week. Journey is pure offsets on the calendar (no recursion).
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

EXPORT_FIRST, EXPORT_LAST = -26, 51   # production_plan / demand_track horizon
WARMUP_FIRST = -45                    # warm-up cohorts to source reg. history

PROD_FIRM_LAST = 8      # W+1..W+8 firm, W+9.. planned
ALLOC_FRONTIER = 8      # cohorts sealed through W+8
SHIP_FRONTIER = 3       # ship events actual through ~W+3
REG_FRONTIER = -1       # registrations actual through W-1

BASE_MODELS = ["Civic", "CR-V", "HR-V", "Jazz", "e:Ny1"]
DRIVE_HANDS = ["LHD", "RHD"]


def variant(base, dh):
    return f"{base} {dh}"


MODELS = [variant(b, d) for b in BASE_MODELS for d in DRIVE_HANDS]  # 10

# Markets: raw relative demand weights (normalised below) + drive hand.
MARKET_RAW = {"UK": 24.0, "Ireland": 3.0, "Germany": 19.0, "France": 14.0,
              "Italy": 9.0, "Spain": 8.0, "Netherlands": 6.0, "Belgium": 5.0,
              "Poland": 4.5, "Nordics": 6.0, "Portugal": 4.5}
MARKETS = list(MARKET_RAW.keys())
_msum = sum(MARKET_RAW.values())
MARKET_SHARE = {m: MARKET_RAW[m] / _msum for m in MARKETS}

MARKET_DRIVE_HAND = {"UK": "RHD", "Ireland": "RHD",
                     "Germany": "LHD", "France": "LHD", "Italy": "LHD",
                     "Spain": "LHD", "Netherlands": "LHD", "Belgium": "LHD",
                     "Poland": "LHD", "Nordics": "LHD", "Portugal": "LHD"}

# e:Ny1 (EV) sold only in EV-forward markets (both drive hands represented).
ENY1_MARKETS = {"UK", "Ireland", "Germany", "France", "Netherlands",
                "Nordics", "Belgium"}

# --- Volume model ---------------------------------------------------------- #
BASE_WEEKLY = 2250
WEEKLY_FLOOR, WEEKLY_CEIL = 1800, 2600
MODEL_RAW = {"Civic": 30.0, "CR-V": 30.0, "HR-V": 15.0, "Jazz": 18.0}
ENY1_RAW_START, ENY1_RAW_END = 3.0, 16.0
MONTH_MULT = {1: 0.92, 2: 0.98, 3: 1.05, 4: 1.02, 5: 1.00, 6: 1.00,
              7: 0.95, 8: 0.88, 9: 1.08, 10: 1.05, 11: 1.02, 12: 0.80}
UK_SPIKE_MONTHS = {3: 1.40, 9: 1.45}

# --- Lead-time assumptions (weeks) ----------------------------------------- #
SHIP_OFFSET = {"Civic": 1, "CR-V": 1, "HR-V": 2, "Jazz": 2, "e:Ny1": 2}  # by base
# Transit: North faster than South (the realistic invariant). Compressed from
# the plan's 8-9/10-12 note so hero Civic LHD W+6 sells Germany Nov / Portugal
# Jan; Portugal held at 12 for the scripted 12->10 edit.
TRANSIT = {"UK": 4, "Ireland": 5, "Germany": 5, "France": 6, "Netherlands": 5,
           "Belgium": 6, "Nordics": 7, "Poland": 7, "Spain": 9, "Italy": 10,
           "Portugal": 12}
INBOUND = {"UK": 1, "Ireland": 1, "Germany": 1, "France": 1, "Netherlands": 1,
           "Belgium": 1, "Nordics": 1, "Poland": 1, "Spain": 2, "Italy": 2,
           "Portugal": 2}
SELL_OFFSETS = [2, 3, 4]
SELL_DEFAULT = [0.40, 0.40, 0.20]
SELL_SOUTH = [0.30, 0.40, 0.30]
SOUTH_MARKETS = {"Spain", "Italy", "Portugal"}

# --- Allocation policy ----------------------------------------------------- #
PRIORITY = {m: 1.0 for m in MARKETS}
MIN_PCT = {m: 0.0 for m in MARKETS}
MIN_PCT["Portugal"] = 0.02
MIN_PCT["Poland"] = 0.03
TARGET_COVER_WEEKS = 8

# Shipment batching cadence (weeks between shipments per market).
CADENCE = {"UK": 1, "Ireland": 2, "Germany": 1, "France": 1,
           "Italy": 2, "Spain": 2, "Netherlands": 2, "Belgium": 2, "Nordics": 2,
           "Poland": 3, "Portugal": 3}
# Batch phase (which weeks a cadenced market ships). Default = index % cadence;
# Spain & Portugal pinned to phase 0 so the hero Civic LHD W+6 cohort carries
# the scripted South-EU January markets (Portugal especially) alongside Italy.
PHASE = {"Spain": 0, "Portugal": 0}

VESSELS = ["MV Sakura", "MV Kanto", "MV Setouchi", "MV Tokaido", "MV Sendai",
           "MV Kyushu", "MV Aomori", "MV Nagano", "MV Iwate", "MV Suzuka"]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def week_start(offset):
    return ANCHOR + dt.timedelta(weeks=offset)


def month_of(offset):
    return week_start(offset).month


def largest_remainder(total, weights):
    """Split integer `total` across keys by `weights`, summing to exactly total."""
    total = int(round(total))
    keys = [k for k, w in weights.items() if w > 0]
    if total <= 0 or not keys:
        return {}
    wsum = sum(weights[k] for k in keys)
    exact = {k: total * weights[k] / wsum for k in keys}
    floor = {k: int(v) for k, v in exact.items()}
    remainder = total - sum(floor.values())
    order = sorted(keys, key=lambda k: exact[k] - floor[k], reverse=True)
    for i in range(remainder):
        floor[order[i % len(order)]] += 1
    return {k: v for k, v in floor.items() if v > 0}


# --------------------------------------------------------------------------- #
# Volume + demand models (base model level)
# --------------------------------------------------------------------------- #

def model_shares(offset):
    frac = (offset - WARMUP_FIRST) / (EXPORT_LAST - WARMUP_FIRST)
    frac = min(1.0, max(0.0, frac))
    raw = dict(MODEL_RAW)
    raw["e:Ny1"] = ENY1_RAW_START + frac * (ENY1_RAW_END - ENY1_RAW_START)
    tot = sum(raw.values())
    return {m: raw[m] / tot for m in BASE_MODELS}


def weekly_total(offset, rng):
    val = BASE_WEEKLY * MONTH_MULT[month_of(offset)] * (1.0 + rng.uniform(-0.03, 0.03))
    return int(round(min(WEEKLY_CEIL, max(WEEKLY_FLOOR, val))))


def base_production(offset, rng):
    return largest_remainder(weekly_total(offset, rng), model_shares(offset))


def base_markets(base):
    """Markets a base model sells to (e:Ny1 restricted to EV markets)."""
    if base == "e:Ny1":
        return [m for m in MARKETS if m in ENY1_MARKETS]
    return list(MARKETS)


def demand_units(base, market, offset):
    """Steady weekly demand for a base model in a market, with UK spikes."""
    mkts = base_markets(base)
    if market not in mkts:
        return 0.0
    wsum = sum(MARKET_SHARE[m] for m in mkts)
    share = MARKET_SHARE[market] / wsum
    base_val = BASE_WEEKLY * model_shares(offset)[base] * share
    if market == "UK" and month_of(offset) in UK_SPIKE_MONTHS:
        base_val *= UK_SPIKE_MONTHS[month_of(offset)]
    return base_val


# --------------------------------------------------------------------------- #
# Drive-hand split + allocation
# --------------------------------------------------------------------------- #

def split_by_drive_hand(base, units):
    """Split a base model's cohort units into LHD/RHD by demand mass."""
    mkts = base_markets(base)
    weights = {dh: sum(MARKET_SHARE[m] for m in mkts
                       if MARKET_DRIVE_HAND[m] == dh) for dh in DRIVE_HANDS}
    return largest_remainder(units, weights)


def _ships_this_week(market, offset):
    c = CADENCE[market]
    phase = PHASE.get(market, MARKETS.index(market) % c)
    return (offset - phase) % c == 0


def allocate(base, dh, offset, units):
    """Allocate a variant's cohort units across its drive-hand markets.

    Conservation: sum == units. Batched (dominant markets weekly, smaller ones
    in larger, staggered, less-frequent shipments). Only markets matching the
    variant's drive hand are eligible.
    """
    eligible = [m for m in base_markets(base) if MARKET_DRIVE_HAND[m] == dh]
    if not eligible or units <= 0:
        return {}
    active = {m: MARKET_SHARE[m] * CADENCE[m]
              for m in eligible if _ships_this_week(m, offset)}
    if not active:
        active = {m: MARKET_SHARE[m] for m in eligible if CADENCE[m] == 1} \
            or {m: MARKET_SHARE[m] for m in eligible}
    return largest_remainder(units, active)


# --------------------------------------------------------------------------- #
# Journey phasing (pure offsets)
# --------------------------------------------------------------------------- #

def sell_weights(market):
    spread = SELL_SOUTH if market in SOUTH_MARKETS else SELL_DEFAULT
    return {off: w for off, w in zip(SELL_OFFSETS, spread)}


def journey(base, prod_week, market, units):
    ship_week = prod_week + SHIP_OFFSET[base]
    arrival_week = ship_week + TRANSIT[market]
    stock_week = arrival_week + INBOUND[market]
    sales = largest_remainder(units, sell_weights(market))
    return {
        "ship_week": ship_week, "arrival_week": arrival_week,
        "stock_week": stock_week,
        "sale_by_week": {stock_week + off: u for off, u in sales.items()},
    }


# --------------------------------------------------------------------------- #
# Simulate the slice universe
# --------------------------------------------------------------------------- #

def simulate():
    rng = random.Random(SEED)
    production = {}   # (variant, prod_week) -> units
    slices = []       # (variant, prod_week, market) with journey

    for w in range(WARMUP_FIRST, EXPORT_LAST + 1):
        base_units = base_production(w, rng)
        for base in BASE_MODELS:
            dh_units = split_by_drive_hand(base, base_units.get(base, 0))
            for dh in DRIVE_HANDS:
                p = dh_units.get(dh, 0)
                v = variant(base, dh)
                production[(v, w)] = p
                if p <= 0:
                    continue
                alloc = allocate(base, dh, w, p)
                assert sum(alloc.values()) == p, \
                    f"conservation broke: {v} W{w}"
                for market, u in alloc.items():
                    slices.append({"base": base, "variant": v, "prod_week": w,
                                   "market": market, "units": u,
                                   **journey(base, w, market, u)})
    return production, slices


# --------------------------------------------------------------------------- #
# Writers
# --------------------------------------------------------------------------- #

def _w(name, header, rows):
    with open(os.path.join(OUT_DIR, name), "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(header)
        wr.writerows(rows)
    return len(rows)


def write_production_plan(production):
    rows = []
    for w in range(EXPORT_FIRST, EXPORT_LAST + 1):
        status = ("actual" if w <= 0 else
                  "firm" if w <= PROD_FIRM_LAST else "planned")
        for v in MODELS:
            rows.append([v, w, week_start(w).isoformat(), status,
                         production[(v, w)]])
    rows.sort(key=lambda r: (r[1], MODELS.index(r[0])))
    return _w("production_plan.csv",
              ["model", "production_week", "week_start_date", "status", "units"],
              rows)


def write_allocation_actuals(slices):
    agg = defaultdict(int)
    for s in slices:
        if EXPORT_FIRST <= s["prod_week"] <= ALLOC_FRONTIER:
            agg[(s["variant"], s["prod_week"], s["market"])] += s["units"]
    rows = [[v, w, mk, u] for (v, w, mk), u in agg.items()]
    rows.sort(key=lambda r: (r[1], MODELS.index(r[0]), MARKETS.index(r[2])))
    return _w("allocation_actuals.csv",
              ["model", "production_week", "market", "units"], rows)


def write_floating_shipments(slices):
    ship = [s for s in slices if s["ship_week"] <= SHIP_FRONTIER
            and s["prod_week"] >= EXPORT_FIRST]
    ship.sort(key=lambda s: (s["ship_week"], s["prod_week"],
                             MODELS.index(s["variant"]), MARKETS.index(s["market"])))
    rows = []
    for i, s in enumerate(ship):
        vessel = f"{VESSELS[i % len(VESSELS)]} / V{2600 + i}"
        rows.append([s["variant"], s["prod_week"], s["market"], s["ship_week"],
                     week_start(s["ship_week"]).isoformat(), s["units"], vessel])
    return _w("floating_shipments.csv",
              ["model", "production_week", "market", "ship_week",
               "ship_date", "units", "vessel_ref"], rows)


def write_registrations_actuals(slices):
    agg = defaultdict(int)
    for s in slices:
        for sale_week, u in s["sale_by_week"].items():
            if EXPORT_FIRST <= sale_week <= REG_FRONTIER:
                agg[(s["variant"], s["market"], sale_week)] += u
    rows = [[v, mk, cw, week_start(cw).isoformat(), u]
            for (v, mk, cw), u in agg.items()]
    rows.sort(key=lambda r: (r[2], MODELS.index(r[0]), MARKETS.index(r[1])))
    return _w("registrations_actuals.csv",
              ["model", "market", "calendar_week", "week_start_date", "units"],
              rows)


def write_lead_times():
    rows = []
    for base in BASE_MODELS:
        rows.append(["prod_to_ship", base, "", "", SHIP_OFFSET[base]])
    for mk in MARKETS:
        rows.append(["transit", "", mk, "", TRANSIT[mk]])
    for mk in MARKETS:
        rows.append(["inbound_lag", "", mk, "", INBOUND[mk]])
    for mk in MARKETS:
        w = sell_weights(mk)
        for off in SELL_OFFSETS:
            rows.append(["sell_through", "", mk, off, round(w[off], 3)])
    return _w("lead_times.csv",
              ["assumption_type", "base_model", "market", "offset_week", "value"],
              rows)


def write_demand_track():
    rows = []
    for w in range(EXPORT_FIRST, EXPORT_LAST + 1):
        for base in BASE_MODELS:
            for mk in base_markets(base):
                dh = MARKET_DRIVE_HAND[mk]
                d = demand_units(base, mk, w)
                rows.append([variant(base, dh), mk, w,
                             week_start(w).isoformat(), int(round(d))])
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
    L = []
    def p(s=""):
        L.append(s)

    p("NIGURI HONDA — DATA GENERATOR QA REPORT")
    p(f"seed={SEED}  anchor(W0)={ANCHOR.isoformat()} (Mon)  "
      f"models={len(MODELS)} markets={len(MARKETS)}")
    p("=" * 64)
    p()
    p("Row counts")
    for name, n in counts.items():
        p(f"  {name:<28} {n:>6}")
    p()

    bad = 0
    for (v, w), pu in production.items():
        if EXPORT_FIRST <= w <= ALLOC_FRONTIER:
            su = sum(s["units"] for s in slices
                     if s["variant"] == v and s["prod_week"] == w)
            if su != pu:
                bad += 1
    p(f"Conservation (sealed cohorts W-26..W+8): "
      f"{'PASS' if bad == 0 else f'FAIL ({bad})'}")

    # Drive-hand integrity: no slice to a mismatched market.
    dh_bad = [s for s in slices
              if MARKET_DRIVE_HAND[s["market"]] != s["variant"].split()[-1]]
    p(f"Drive-hand integrity (no RHD->LHD or LHD->RHD slices): "
      f"{'PASS' if not dh_bad else f'FAIL ({len(dh_bad)})'}")

    wk = defaultdict(int)
    for (v, w), u in production.items():
        if EXPORT_FIRST <= w <= EXPORT_LAST:
            wk[w] += u
    lo, hi = min(wk.values()), max(wk.values())
    p(f"Weekly production totals: min={lo} max={hi} (band {WEEKLY_FLOOR}-{WEEKLY_CEIL}) "
      f"-> {'in band' if lo >= WEEKLY_FLOOR and hi <= WEEKLY_CEIL else 'OUT'}")
    p()

    p("Hero cohort trace — Civic LHD, Production Week W+6")
    hero = [s for s in slices if s["variant"] == "Civic LHD" and s["prod_week"] == 6]
    hero.sort(key=lambda s: MARKETS.index(s["market"]))
    p(f"  produced W+6 ({week_start(6).isoformat()}), "
      f"{sum(s['units'] for s in hero)} units, {len(hero)} market slices")
    for s in hero:
        peak = max(s["sale_by_week"], key=lambda k: s["sale_by_week"][k])
        p(f"    {s['market']:<12} {s['units']:>4}u  ship W+{s['ship_week']}"
          f" -> arr W+{s['arrival_week']} -> stock W+{s['stock_week']}"
          f" -> peak sale W+{peak} ({week_start(peak).strftime('%b %Y')})")
    de = next((s for s in hero if s["market"] == "Germany"), None)
    pt = next((s for s in hero if s["market"] == "Portugal"), None)
    if de and pt:
        dm = week_start(max(de["sale_by_week"], key=lambda k: de["sale_by_week"][k])).month
        pm = week_start(max(pt["sale_by_week"], key=lambda k: pt["sale_by_week"][k])).month
        p(f"  Narrative: Germany peak {week_start(0).replace(month=dm).strftime('%B')} / "
          f"Portugal peak {week_start(0).replace(month=pm).strftime('%B')} "
          f"({'OK' if dm == 11 and pm == 1 else 'CHECK'})")
    # RHD hero counterpart
    rhd = [s for s in slices if s["variant"] == "Civic RHD" and s["prod_week"] == 6]
    p(f"  (Civic RHD W+6 -> {sorted(set(s['market'] for s in rhd))}, "
      f"{sum(s['units'] for s in rhd)} units)")
    p()

    with open(os.path.join(OUT_DIR, "QA_REPORT.txt"), "w") as f:
        f.write("\n".join(L) + "\n")
    return "\n".join(L), (bad == 0 and not dh_bad
                          and lo >= WEEKLY_FLOOR and hi <= WEEKLY_CEIL)


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
    print("data written to", OUT_DIR, "\nQA:", "PASS" if ok else "REVIEW")


if __name__ == "__main__":
    main()

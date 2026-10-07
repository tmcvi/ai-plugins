#!/usr/bin/env python3
"""Turn a raw Pigment partner export into a file the saved import can read.

The export's headers do not match the `Pigment Pipeline` property names, it
carries no load date, and it spells one person two ways. Rather than make the
import operator fix that by hand every week, this does it:

  * renames each column to the property it loads into, so the mapping in
    Pigment's import dialog is 1:1 and never has to be re-thought
  * adds `Last Seen`, which nothing in the export supplies and which the whole
    drop-detection mechanism rests on (PIG Latest Load Date is MAX of it)
  * folds known spelling variants of a partner contact onto one name
  * refuses to emit a file whose key is blank or duplicated, because the
    import is keyed on the opportunity name and would silently merge rows

It reports anything it cannot resolve rather than quietly dropping it: a stage
or attach type the model has never seen is listed so it can be mapped on the
Admin screen before the numbers are believed.

Usage:  python3 tools/prep_pigment_import.py <export.csv> [--load-date YYYY-MM-DD]
        [--out imports/pigment-pipeline-<date>.csv]
"""
import argparse
import collections
import csv
import datetime
import pathlib
import sys

# Export header -> Pigment Pipeline property. Anything absent here is dropped,
# which is deliberate: a column with no property has nowhere to land.
COLUMNS = {
    "Company": "Company",
    "Opportunity": "Pigment Opportunity Name",
    "Stage": "Pigment Stage",
    "Partner Attach Type": "Partner Attach Type",
    "Influence %": "Influence %",
    "Create Date": "Create Date",
    "Close Date": "Close Date",
    "ACV (USD)": "ACV USD",
    "Delivery Approach": "Delivery Approach",
    "Segment": "Segment",
    "Industry": "Industry",
    "Pigment AE": "Pigment AE",
    "Partner Sales Contact": "Partner Sales Contact",
    "Partner Notes": "Partner Notes",
}

# SFDC carries both spellings for the same person; the Partner Contact list
# holds one of them, and two entries would split the match signal in half.
CONTACT_ALIASES = {
    "Thomas Cvijanovic": "Tom Cvijanovic",
}

KEY = "Pigment Opportunity Name"


def load(path):
    with open(path, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("export")
    ap.add_argument("--load-date", default=datetime.date.today().isoformat())
    ap.add_argument("--out")
    args = ap.parse_args(argv)

    rows = load(args.export)
    if not rows:
        print("  x the export has no rows")
        return 1

    missing = [c for c in COLUMNS if c not in rows[0]]
    if missing:
        print("  x the export is missing expected columns: " + ", ".join(missing))
        print("    the report's schema has changed again - check the mapping before loading")
        return 1
    extra = [c for c in rows[0] if c not in COLUMNS]

    out_rows, problems = [], []
    for r in rows:
        o = {prop: (r[col] or "").strip() for col, prop in COLUMNS.items()}
        contact = o["Partner Sales Contact"]
        o["Partner Sales Contact"] = CONTACT_ALIASES.get(contact, contact)
        o["Last Seen"] = args.load_date
        out_rows.append(o)

    keys = [r[KEY] for r in out_rows]
    blank = sum(1 for k in keys if not k)
    if blank:
        problems.append("%d row(s) have a blank opportunity name - the import key" % blank)
    dupes = {k: n for k, n in collections.Counter(keys).items() if k and n > 1}
    if dupes:
        problems.append("%d duplicated opportunity name(s); the import would merge them:" % len(dupes))
        for k, n in list(dupes.items())[:10]:
            problems.append("      x%d  %s" % (n, k))
    if problems:
        for p in problems:
            print("  x " + p)
        return 1

    out = pathlib.Path(args.out or ("imports/pigment-pipeline-%s.csv" % args.load_date))
    out.parent.mkdir(parents=True, exist_ok=True)
    header = list(COLUMNS.values()) + ["Last Seen"]
    with out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        w.writerows(out_rows)

    print("  + %s" % out)
    print("    %d rows, %d columns, Last Seen = %s" % (len(out_rows), len(header), args.load_date))
    if extra:
        print("    dropped (no property to load into): " + ", ".join(extra))
    renamed = [(c, p) for c, p in COLUMNS.items() if c != p]
    print("    renamed %d headers to match the property names" % len(renamed))
    folded = sum(1 for r in rows if (r["Partner Sales Contact"] or "").strip() in CONTACT_ALIASES)
    if folded:
        print("    folded %d contact row(s) onto a single spelling" % folded)
    return 0


if __name__ == "__main__":
    sys.exit(main())

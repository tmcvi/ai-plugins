#!/usr/bin/env python3
"""Generate mock data-source payloads for the Frame harness.

Reads the generated data-source definitions and column names, then emits one
payload per per-type part in exactly the shape the live SDK returns: row-major
rows of {labels, values}, values in the order the source declares them.

Values are synthetic. The harness exists to prove the bundles parse, boot,
subscribe and render - not to check the numbers, which the Pigment model owns.
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / "src"

STAGES = ['Holding pool', 'First meeting', 'Qualified', 'Demo', 'Scoping',
          'Contracting', 'Closed Won', 'Closed Lost']
SIZES = ['Small', 'Medium', 'Large', 'Strategic']
MOTIONS = ['Sourced', 'Influenced', 'Services Only']
USECASES = ['FP&A', 'Consolidation', 'Supply Chain', 'SPM', 'Other']
PEOPLE = ['Tom McVicar', 'Alex Reid', 'Sam Okafor', 'Priya Nair']
AES = ['J. Dupont', 'M. Rossi', 'K. Andersen', 'L. Silva', 'R. Chen']
PIGSTAGES = ['S0 - SQO', 'S1 - Discover', 'S2 - Build value', 'S3 - Win the analyst',
             'S4 - Validate', 'S5 - Contracting', 'U1 - Connect', 'U2 - Validate',
             'U3 - Contracting', 'R3 - Contracting', 'Closed Won', 'Closed Lost']
ATTACH = ['Sourced', 'Influenced', 'Deployed']
OPPS = ['Northwind - FP&A', 'Calderwood - Consolidation', 'Bellhaven - Supply Chain',
        'Marrow Foods - FP&A', 'Tessellate - SPM', 'Quayside - FP&A']
PIGROWS = ['Northwind Group - New Business', 'Calderwood plc - Upsell',
           'Bellhaven Ltd - New Business', 'Marrow Foods - Early Renewal',
           'Tessellate - New Business', 'Quayside - Amendment',
           'Harlow Industries - New Business', 'Ventor - Upsell']
PROJECT_WEEKS = ['W%02d' % i for i in range(1, 17)]


def calendar_weeks(n=30):
    """WC labels on a Monday cadence, the shape PH Calendar Week returns."""
    import datetime
    start = datetime.date(2026, 1, 5)
    return ['WC ' + (start + datetime.timedelta(days=7 * i)).isoformat() for i in range(n)]


WEEKS = calendar_weeks()

ROSTER = {
    'opportunity': OPPS, 'pigmentPipeline': PIGROWS, 'stage': STAGES,
    'dealSize': SIZES, 'salesMotion': MOTIONS, 'useCase': USECASES,
    'salesPerson': PEOPLE, 'pigmentAE': AES, 'pigmentStage': PIGSTAGES,
    'partnerAttachType': ATTACH, 'projectWeek': PROJECT_WEEKS, 'week': WEEKS,
}

# Columns whose value must come from a particular roster, or a fixed answer,
# because a page branches on it rather than just printing it.
BY_COLUMN = {
    'Sales Person': lambda i: PEOPLE[i % len(PEOPLE)],
    'Stage': lambda i: STAGES[i % 6],
    'Use Case': lambda i: USECASES[i % len(USECASES)],
    'Sales Motion': lambda i: MOTIONS[i % len(MOTIONS)],
    'Deal Size': lambda i: SIZES[i % len(SIZES)],
    'Pigment AE': lambda i: AES[i % len(AES)],
    'Matched Pigment Opportunity': lambda i: PIGROWS[i] if i % 2 == 0 and i < len(PIGROWS) else None,
    'Pigment Stage': lambda i: PIGSTAGES[i % len(PIGSTAGES)],
    'Partner Sales Contact': lambda i: PEOPLE[i % len(PEOPLE)],
    'Partner Attach Type': lambda i: ATTACH[i % len(ATTACH)],
    'Maps To Stage': lambda i: STAGES[i % len(STAGES)] if i % 5 else None,
    'Maps To Sales Motion': lambda i: MOTIONS[i % len(MOTIONS)],
    'PH Calendar Week': lambda i: WEEKS[i % len(WEEKS)],
    'Pipeline Group': lambda i: ('Won' if i == 6 else 'Lost' if i == 7 else 'Open'),
    'Track': lambda i: ('New' if i < 6 else 'Upsell' if i < 9 else 'Renewal'),
    'CRM Codes': lambda i: ['FPA', 'CONS', 'SC', 'SPM', ''][i % 5],
    'CRM Name': lambda i: PEOPLE[i % len(PEOPLE)].upper(),
    'Email': lambda i: PEOPLE[i % len(PEOPLE)].split()[0].lower() + '@viridiansolutions.io',
    'Order': lambda i: i + 1,
    'Active': lambda i: i % 4 != 3,
    'Is Open': lambda i: i < 6,
    'Is Won': lambda i: i == 6,
    'Is Lost': lambda i: i == 7,
    'OPP Is Open': lambda i: i % 6 < 4,
    'OPP Is Won': lambda i: i % 6 == 4,
    'OPP Is Lost': lambda i: i % 6 == 5,
    'ALN Match Status': lambda i: 'Matched' if i % 2 == 0 else 'Viridian only',
    'ALN Stage Alignment': lambda i: 'Aligned' if i % 3 else 'Pigment ahead',
    'ALN Pigment Match Status': lambda i: 'Matched' if i % 2 == 0 else 'Pigment only',
    'ASM Project Duration Weeks': lambda i: [6, 8, 12, 16][i % 4],
    'ASM Start Lag Weeks': lambda i: [2, 2, 4, 4][i % 4],
    'ASM Licence ARR $': lambda i: [60000, 120000, 250000, 500000][i % 4],
    'ASM Standard Days': lambda i: [20, 40, 75, 140][i % 4],
    'ASM Standard Day Rate £': lambda i: 1100,
    'ASM Hours per Day': lambda i: 7.5,
    'ASM FX Rate USD to GBP': lambda i: 0.78,
}


def typed_value(vtype, column, row_index, col_index):
    if column in BY_COLUMN:
        return BY_COLUMN[column](row_index)
    if vtype == 'Boolean':
        return (row_index + col_index) % 3 != 0
    if vtype == 'Text':
        return column + ' ' + str(row_index + 1)
    if vtype == 'Date':
        return '2026-%02d-%02d' % ((row_index % 12) + 1, (row_index % 27) + 1)
    if vtype == 'Dimension':
        return 'Member ' + str(row_index + 1)
    if vtype == 'Integer':
        return (row_index + 1) * (col_index + 2)
    # Decimal: percentages stay inside 0..1, everything else is money-ish.
    if '%' in column:
        return round(0.05 + ((row_index * 7 + col_index * 3) % 90) / 100.0, 3)
    return round(1000.0 * ((row_index + 1) * (col_index + 1) % 37), 2)


def label_sets(labels):
    """Cartesian product of the label bindings' rosters, as row label paths."""
    if not labels:
        return [[]]
    out = [[]]
    for lab in labels:
        roster = ROSTER.get(lab['binding'], ['Item 1', 'Item 2', 'Item 3'])
        out = [prev + [name] for prev in out for name in roster]
    return out


def main():
    ds_all = json.loads((SRC / "datasources.json").read_text())
    cols_all = json.loads((SRC / "dscolumns.json").read_text())

    seen, fixtures = {}, {}
    for page_sources in ds_all.values():
        for ds in page_sources:
            name = ds["name"]
            if name in seen:
                continue
            seen[name] = True
            vtype = name.rsplit("__", 1)[-1] if "__" in name else "Decimal"
            columns = cols_all.get(name, [])
            rows = []
            for r, path in enumerate(label_sets(ds.get("labels", []))):
                rows.append({
                    "labels": path,
                    "values": [typed_value(vtype, columns[c] if c < len(columns) else "", r, c)
                               for c in range(len(columns))]
                })
            fixtures[name] = {"rows": rows}

    items = {alias: names for alias, names in ROSTER.items()}
    out = ("window.FIXTURES = " + json.dumps(fixtures) + ";\n"
           "window.ITEMS = " + json.dumps(items) + ";\n")
    (HERE / "fixtures.js").write_text(out)
    print("  + fixtures.js  %d data sources, %d item lists, %d bytes"
          % (len(fixtures), len(items), len(out)))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate frames/src/bindings.json and datasources.json.

This Pigment instance rejects View bindings on Frames (decision D11), so each
former View is expressed as an inline data source over List and Metric
bindings. Data sources deliberately keep the alias names the page modules
already subscribe to, so no page code depends on this change.

Run after adding or renaming a metric:  python3 tools/gen_bindings.py
"""
import collections
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent.parent
IDS = json.loads((HERE / "docs" / "pigment-ids.json").read_text())

# docs/pigment-ids.json keys lists by their friendly name; the Frames address
# them by camelCase alias, so map once here.
LIST_ALIAS = {
    "opportunity": "Opportunity",
    "pigmentPipeline": "Pigment Pipeline",
    "salesPerson": "Sales Person",
    "stage": "Stage",
    "useCase": "Use Case",
    "salesMotion": "Sales Motion",
    "dealSize": "Deal Size",
    "pigmentAE": "Pigment AE",
    "pigmentStage": "Pigment Stage",
    "partnerAttachType": "Partner Attach Type",
    "projectWeek": "Project Week",
}
L = {a: IDS["lists"][n] for a, n in LIST_ALIAS.items()}
L["week"] = IDS["calendar"]["weekDimensionId"]
L["month"] = IDS["calendar"]["monthDimensionId"]

M = json.loads((HERE / "docs" / "metric-ids.json").read_text())

# Metric aliases the page modules use directly with editValue.
WRITE_ALIAS = {
    "oppOverrideDays": "OPP Override Days",
    "oppOverrideRate": "OPP Override Day Rate £",
    "phOverrideProfile": "PH Override Profile %",
    "asmLicence": "ASM Licence ARR $",
    "asmDays": "ASM Standard Days",
    "asmDuration": "ASM Project Duration Weeks",
    "asmLag": "ASM Start Lag Weeks",
    "asmProfile": "ASM Standard Profile %",
    "asmRate": "ASM Standard Day Rate £",
    "asmHours": "ASM Hours per Day",
    "asmFx": "ASM FX Rate USD to GBP",
    "asmCommission": "ASM Commission Rate %",
    "asmWin": "ASM Win Rate %",
}

# Currency and percent markers carry meaning: "OPP Licence Value $" and
# "OPP Licence Value £" are different metrics and must not collapse to one alias.
MARKERS = {"$": "Usd", "£": "Gbp", "%": "Pct"}


def alias(name):
    for a, n in WRITE_ALIAS.items():
        if n == name:
            return a
    out, up = [], False
    for ch in name:
        if ch in MARKERS:
            out.append(MARKERS[ch])
            up = False
        elif ch.isalnum():
            out.append(ch.upper() if up else ch)
            up = False
        else:
            up = True
    a = "".join(out)
    return "m" + a[0].upper() + a[1:]


PIPELINE_VALUES = [
    "OPP Licence Value $", "OPP Licence Value £", "OPP Commission Rate %",
    "OPP Commission £", "OPP Win Rate %", "OPP Standard Days", "OPP Override Days",
    "OPP Effective Days", "OPP Override Day Rate £", "OPP Effective Day Rate £",
    "OPP Services Value £", "OPP Standard Services Value £",
    "OPP Weighted Services Value £", "OPP Weighted Commission £",
    "OPP Is Days Overridden", "OPP Is Rate Overridden", "OPP Is Open", "OPP Is Won",
    "OPP Is Lost", "OPP In Forecast", "OPP Duration Weeks", "ALN Match Status",
    "ALN Stage Gap", "ALN Stage Alignment", "ALN Close Date Gap Days",
    "ALN Motion Consistent", "ALN Matched Row Dropped", "ALN Pigment Closed",
    "PH Profile Total %", "PH Profile Is Valid", "PH Has Override Profile",
    "PH Phased Outside Calendar £", "TST Phasing Reconciles",
]
PIGMENT_VALUES = [
    "PIG In Latest Load", "PIG Derived Account", "PIG Derived Use Case Codes",
    "PIG Derived Close Month", "PIG Derived Deal Type", "PIG Close Month Mismatch",
    "ALN Pigment Match Status", "ALN Matched Deal Count",
    "ALN Pigment Mapped Stage Order", "ALN Pigment Row Closed", "PIG First Seen Calc",
]
FORECAST_VALUES = [
    "PH Services Revenue £", "PH Commission £", "PH Days", "PH Hours",
    "PH Licence Value £", "PH Total Revenue £",
    "PH Weighted Services Revenue £", "PH Weighted Commission £",
    "PH Weighted Days", "PH Weighted Hours", "PH Weighted Total Revenue £",
]
PROFILE_VALUES = ["PH Effective Profile %", "PH Override Profile %", "PH Calendar Week"]
ASSUMPTION_VALUES = [
    "ASM Licence ARR $", "ASM Standard Days", "ASM Project Duration Weeks",
    "ASM Start Lag Weeks", "TST Profile Sums", "TST Profile Zero Beyond Duration",
]
SUMMARY_VALUES = [
    "PIG Latest Load Date", "PIG Rows Total", "PIG Rows In Latest Load",
    "PIG Rows Dropped", "PIG Unmapped Stages", "TST Phasing Reconciles All",
]
SCALAR_VALUES = ["ASM Standard Day Rate £", "ASM Hours per Day", "ASM FX Rate USD to GBP"]

DS = {
    "vwPipelineGrid":      (["opportunity"], [], PIPELINE_VALUES),
    "vwPigmentGrid":       (["pigmentPipeline"], [], PIGMENT_VALUES),
    "vwProfileByDeal":     (["projectWeek"], ["opportunity"], PROFILE_VALUES),
    "vwForecastMonth":     (["opportunity", "month"], [], FORECAST_VALUES),
    "vwForecastWeek":      (["opportunity", "week"], [], FORECAST_VALUES),
    "vwAssumptions":       (["dealSize"], [], ASSUMPTION_VALUES),
    "vwScalarAssumptions": ([], [], SCALAR_VALUES),
    "vwCommissionRates":   (["salesMotion"], [], ["ASM Commission Rate %"]),
    "vwWinRates":          (["stage"], [], ["ASM Win Rate %"]),
    "vwStandardProfiles":  (["projectWeek", "dealSize"], [], ["ASM Standard Profile %"]),
    "vwImportSummary":     ([], [], SUMMARY_VALUES),
}

PAGE_DS = {
    "admin":    ["vwAssumptions", "vwScalarAssumptions", "vwCommissionRates", "vwWinRates",
                 "vwStandardProfiles", "vwImportSummary"],
    "newDeal":  ["vwAssumptions", "vwScalarAssumptions", "vwCommissionRates", "vwImportSummary"],
    "pipeline": ["vwPipelineGrid", "vwProfileByDeal", "vwScalarAssumptions", "vwImportSummary"],
    "deal":     ["vwPipelineGrid", "vwProfileByDeal", "vwScalarAssumptions", "vwImportSummary"],
    "matching": ["vwPipelineGrid", "vwPigmentGrid", "vwImportSummary", "vwAssumptions"],
    "forecast": ["vwForecastMonth", "vwForecastWeek", "vwPipelineGrid", "vwImportSummary"],
}
PAGE_LISTS = {
    "admin":    [("dealSize", 0), ("projectWeek", 0), ("salesMotion", 0), ("stage", 0),
                 ("useCase", 0), ("partnerAttachType", 0), ("pigmentStage", 1),
                 ("salesPerson", 1), ("pigmentAE", 1)],
    "newDeal":  [("opportunity", 1), ("salesPerson", 0), ("stage", 0), ("useCase", 0),
                 ("salesMotion", 0), ("dealSize", 0), ("pigmentAE", 0), ("projectWeek", 0)],
    "pipeline": [("opportunity", 1), ("pigmentPipeline", 0), ("salesPerson", 0), ("stage", 0),
                 ("useCase", 0), ("salesMotion", 0), ("dealSize", 0), ("pigmentAE", 0),
                 ("projectWeek", 0)],
    "matching": [("opportunity", 1), ("pigmentPipeline", 0), ("salesPerson", 0), ("stage", 0),
                 ("useCase", 0), ("salesMotion", 0), ("dealSize", 0), ("pigmentAE", 0),
                 ("pigmentStage", 0), ("partnerAttachType", 0)],
    "forecast": [("opportunity", 0), ("stage", 0), ("salesPerson", 0), ("useCase", 0),
                 ("salesMotion", 0), ("dealSize", 0)],
}
PAGE_LISTS["deal"] = PAGE_LISTS["pipeline"]

PAGE_WRITES = {
    "admin":    ["asmLicence", "asmDays", "asmDuration", "asmLag", "asmProfile", "asmRate",
                 "asmHours", "asmFx", "asmCommission", "asmWin"],
    "pipeline": ["oppOverrideDays", "oppOverrideRate", "phOverrideProfile"],
    "newDeal":  [], "matching": [], "forecast": [],
}
PAGE_WRITES["deal"] = PAGE_WRITES["pipeline"]

PAGES = ["admin", "newDeal", "pipeline", "deal", "matching", "forecast"]


def main():
    bindings, datasources, problems = {}, {}, []

    # Guard the invariant that broke once: two metrics must never share an alias.
    seen_alias = {}
    for name in M:
        a = alias(name)
        if a in seen_alias and seen_alias[a] != name:
            problems.append("alias collision: %s <- %r and %r" % (a, seen_alias[a], name))
        seen_alias[a] = name

    for page in PAGES:
        binds, seen = [], set()

        def add_list(al, write):
            if al in seen:
                return
            seen.add(al)
            binds.append({"name": al, "type": "List", "listId": L[al],
                          "canRead": True, "canWrite": bool(write)})

        def add_metric(al, mid, write):
            if al in seen:
                return
            seen.add(al)
            binds.append({"name": al, "type": "Metric", "metricId": mid,
                          "canRead": True, "canWrite": bool(write)})

        for al, w in PAGE_LISTS[page]:
            add_list(al, w)

        ds_list = []
        for ds_name in PAGE_DS[page]:
            labels, selectors, values = DS[ds_name]
            for dim in labels + selectors:
                add_list(dim, 0)
            vals = []
            for mname in values:
                a = alias(mname)
                add_metric(a, M[mname], a in PAGE_WRITES[page])
                vals.append({"binding": a, "aggregator": "Sum"})
            ds_list.append({
                "name": ds_name,
                "labels": [{"binding": d} for d in labels],
                "selectors": [{"binding": d} for d in selectors],
                "values": vals,
            })

        for wa in PAGE_WRITES[page]:
            add_metric(wa, M[WRITE_ALIAS[wa]], True)

        names = [x["name"] for x in binds]
        for n, c in collections.Counter(names).items():
            if c > 1:
                problems.append("%s: duplicate binding name %s" % (page, n))
        mids = [x["metricId"] for x in binds if x["type"] == "Metric"]
        for mid, c in collections.Counter(mids).items():
            if c > 1:
                problems.append("%s: metric bound twice %s" % (page, mid))
        known = set(names)
        for ds in ds_list:
            for side in ("labels", "selectors", "values"):
                for ref in ds[side]:
                    if ref["binding"] not in known:
                        problems.append("%s/%s: unresolved binding %s"
                                        % (page, ds["name"], ref["binding"]))

        bindings[page] = binds
        datasources[page] = ds_list

    if problems:
        for p in problems:
            print("  x " + p)
        return 1

    (HERE / "frames" / "src" / "bindings.json").write_text(json.dumps(bindings, indent=2))
    (HERE / "frames" / "src" / "datasources.json").write_text(json.dumps(datasources, indent=2))
    for p in PAGES:
        print("  + %-9s %2d bindings, %d data sources" % (p, len(bindings[p]), len(datasources[p])))
    print("\nNo alias collisions, no duplicate bindings, every data source resolves.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

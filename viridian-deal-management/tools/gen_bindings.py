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

# List properties read through data sources (decision D17). subscribeToItems
# now returns item *names* only, so every property a Frame shows has to come
# back as a data-source value. Technical names are the slugged ids Pigment
# assigns; read them with get_list_items, never guess them.
#   alias: (list alias, technical name, the column name the pages read)
PROPS = {
    # Opportunity - the nine sales fields plus the system dates and the match.
    "oppSalesPerson":  ("opportunity", "sales_person_TANUAJ", "Sales Person"),
    "oppStage":        ("opportunity", "stage_T28KCI", "Stage"),
    "oppCloseDate":    ("opportunity", "expected_close_date_10AJNG", "Expected Close Date"),
    "oppUseCase":      ("opportunity", "use_case_2FFYNB", "Use Case"),
    "oppSalesMotion":  ("opportunity", "sales_motion_MN98AU", "Sales Motion"),
    "oppDealSize":     ("opportunity", "deal_size_NWXWWW", "Deal Size"),
    "oppPigmentAE":    ("opportunity", "pigment_ae_RDLDT8", "Pigment AE"),
    "oppNotes":        ("opportunity", "notes_AV0MTG", "Notes"),
    "oppMatched":      ("opportunity", "matched_pigment_opportunity_8CRBB3",
                        "Matched Pigment Opportunity"),
    "oppCreatedOn":    ("opportunity", "created_on_H6YAOP", "Created On"),
    "oppUpdatedOn":    ("opportunity", "last_updated_on_QTQWWX", "Last Updated On"),
    "oppClosedOn":     ("opportunity", "closed_on_V8DFEL", "Closed On"),
    # Pigment Pipeline - everything the Matching and Deal screens show.
    "pigStage":        ("pigmentPipeline", "pigment_stage_K38I0J", "Pigment Stage"),
    "pigCloseDate":    ("pigmentPipeline", "close_date_VE8VFG", "Close Date"),
    "pigCreateDate":   ("pigmentPipeline", "create_date_HH2KVO", "Create Date"),
    "pigAE":           ("pigmentPipeline", "pigment_ae_A7P23V", "Pigment AE"),
    "pigContact":      ("pigmentPipeline", "partner_sales_contact_4NRZMZ",
                        "Partner Sales Contact"),
    "pigAttach":       ("pigmentPipeline", "partner_attach_type_V3DX5V",
                        "Partner Attach Type"),
    "pigSegment":      ("pigmentPipeline", "segment_7D9WDC", "Segment"),
    "pigIndustry":     ("pigmentPipeline", "industry_5QVQEB", "Industry"),
    "pigAcv":          ("pigmentPipeline", "acv_usd_N7DE94", "ACV USD"),
    "pigDelivery":     ("pigmentPipeline", "delivery_approach_VSUTR5", "Delivery Approach"),
    "pigForecastCat":  ("pigmentPipeline", "forecast_category_X21MLK", "Forecast Category"),
    "pigInfluence":    ("pigmentPipeline", "influence___QIV162", "Influence %"),
    "pigFirstSeen":    ("pigmentPipeline", "first_seen_RDDBXB", "First Seen"),
    "pigLastSeen":     ("pigmentPipeline", "last_seen_8X6JHH", "Last Seen"),
    # Reference lists - the properties that drive sort order and matching.
    "stageOrder":      ("stage", "_order_XMZILT", "Order"),
    "stageIsOpen":     ("stage", "is_open_1TYBBM", "Is Open"),
    "stageIsWon":      ("stage", "is_won_0Q2X2I", "Is Won"),
    "stageIsLost":     ("stage", "is_lost_1PJNNH", "Is Lost"),
    "stageGroup":      ("stage", "pipeline_group_ATQ04P", "Pipeline Group"),
    "sizeOrder":       ("dealSize", "_order_XA1UNE", "Order"),
    "useCaseCodes":    ("useCase", "crm_codes_KIZEWS", "CRM Codes"),
    "personCrmName":   ("salesPerson", "crm_name_D5SKRA", "CRM Name"),
    "personEmail":     ("salesPerson", "email_WZ7QF1", "Email"),
    "pigStageOrder":   ("pigmentStage", "_order_1W8SME", "Order"),
    "pigStageTrack":   ("pigmentStage", "track_A6QJ12", "Track"),
    "pigStageMapsTo":  ("pigmentStage", "maps_to_stage_ERVXPC", "Maps To Stage"),
    "attachMapsTo":    ("partnerAttachType", "maps_to_sales_motion_YRSF3X",
                        "Maps To Sales Motion"),
    "aeActive":        ("pigmentAE", "active_QXZ85V", "Active"),
    "weekOffset":      ("projectWeek", "_offset_MUHMXV", "Offset"),
}

# A data source carries one value type only - Pigment refuses to mix them
# (decision D18) - so every source is split by the type of its values. These
# are the types Pigment reports; anything not listed here is Decimal.
METRIC_TYPE = {}
for _name in [
    "ALN Pigment Row Closed", "OPP Is Open", "TST Profile Zero Beyond Duration",
    "OPP Is Lost", "PIG In Latest Load", "OPP Is Won", "PH Has Override Profile",
    "TST Phasing Reconciles", "ALN Motion Consistent", "ALN Matched Row Dropped",
    "OPP In Forecast", "OPP Is Days Overridden", "PH Profile Is Valid",
    "TST Profile Sums", "TST Phasing Reconciles All", "ALN Pigment Closed",
    "OPP Is Rate Overridden", "PIG Close Month Mismatch",
]:
    METRIC_TYPE[_name] = "Boolean"
for _name in [
    "PIG Derived Use Case Codes", "PIG Derived Deal Type", "ALN Stage Alignment",
    "PIG Derived Close Month", "PIG Derived Account", "ALN Pigment Match Status",
    "ALN Match Status",
]:
    METRIC_TYPE[_name] = "Text"
for _name in ["OPP Start Date", "PIG Latest Load Date", "PIG First Seen Calc"]:
    METRIC_TYPE[_name] = "Date"
for _name in ["OPP Close Week", "OPP Start Week", "PH Calendar Week", "OPP Close Month"]:
    METRIC_TYPE[_name] = "Dimension"
for _name in [
    "ALN Close Date Gap Days", "OPP Duration Weeks", "PIG Rows Total",
    "ASM Project Duration Weeks", "ALN Stage Gap", "PIG Unmapped Stages",
    "ALN Matched Deal Count", "ASM Start Lag Weeks", "ALN Pigment Mapped Stage Order",
    "PIG Rows Dropped", "PIG Rows In Latest Load",
]:
    METRIC_TYPE[_name] = "Integer"

PROP_TYPE = {
    "oppSalesPerson": "Dimension", "oppStage": "Dimension", "oppCloseDate": "Date",
    "oppUseCase": "Dimension", "oppSalesMotion": "Dimension", "oppDealSize": "Dimension",
    "oppPigmentAE": "Dimension", "oppNotes": "Text", "oppMatched": "Dimension",
    "oppCreatedOn": "Date", "oppUpdatedOn": "Date", "oppClosedOn": "Date",
    "pigStage": "Dimension", "pigCloseDate": "Date", "pigCreateDate": "Date",
    "pigAE": "Dimension", "pigContact": "Dimension", "pigAttach": "Dimension",
    "pigSegment": "Text", "pigIndustry": "Text", "pigAcv": "Decimal",
    "pigDelivery": "Text", "pigForecastCat": "Text", "pigInfluence": "Decimal",
    "pigFirstSeen": "Date", "pigLastSeen": "Date",
    "stageOrder": "Integer", "stageIsOpen": "Boolean", "stageIsWon": "Boolean",
    "stageIsLost": "Boolean", "stageGroup": "Text", "sizeOrder": "Integer",
    "useCaseCodes": "Text", "personCrmName": "Text", "personEmail": "Text",
    "pigStageOrder": "Integer", "pigStageTrack": "Text", "pigStageMapsTo": "Dimension",
    "attachMapsTo": "Dimension", "aeActive": "Boolean", "weekOffset": "Integer",
}


def value_type(value):
    if value in PROPS:
        return PROP_TYPE[value]
    return METRIC_TYPE.get(value, "Decimal")


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

# Property values, in the order the pages expect to find them.
OPP_PROPS = [
    "oppSalesPerson", "oppStage", "oppCloseDate", "oppUseCase", "oppSalesMotion",
    "oppDealSize", "oppPigmentAE", "oppNotes", "oppMatched", "oppCreatedOn",
    "oppUpdatedOn", "oppClosedOn",
]
PIG_PROPS = [
    "pigStage", "pigCloseDate", "pigCreateDate", "pigAE", "pigContact", "pigAttach",
    "pigSegment", "pigIndustry", "pigAcv", "pigDelivery", "pigForecastCat",
    "pigInfluence", "pigFirstSeen", "pigLastSeen",
]
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
    "vwPipelineGrid":      (["opportunity"], [], OPP_PROPS + PIPELINE_VALUES),
    "vwPigmentGrid":       (["pigmentPipeline"], [], PIG_PROPS + PIGMENT_VALUES),
    # Selectors are gone: the profile source carries every deal and the editor
    # filters client-side, so no dynamic filter has to be maintained (D17).
    "vwProfileByDeal":     (["opportunity", "projectWeek"], [], PROFILE_VALUES),
    # One weekly source. Month is a property of Week, not a dimension of the PH
    # metrics, so Pigment rejects it as a label; the page rolls weeks up (D17).
    "vwForecast":          (["opportunity", "week"], [], FORECAST_VALUES),
    "vwStageProps":        (["stage"], [],
                            ["stageOrder", "stageIsOpen", "stageIsWon", "stageIsLost",
                             "stageGroup"]),
    "vwDealSizeProps":     (["dealSize"], [], ["sizeOrder"]),
    "vwUseCaseProps":      (["useCase"], [], ["useCaseCodes"]),
    "vwSalesPersonProps":  (["salesPerson"], [], ["personCrmName", "personEmail"]),
    "vwPigmentStageProps": (["pigmentStage"], [],
                            ["pigStageOrder", "pigStageTrack", "pigStageMapsTo"]),
    "vwAttachProps":       (["partnerAttachType"], [], ["attachMapsTo"]),
    "vwPigmentAEProps":    (["pigmentAE"], [], ["aeActive"]),
    "vwAssumptions":       (["dealSize"], [], ASSUMPTION_VALUES),
    "vwScalarAssumptions": ([], [], SCALAR_VALUES),
    "vwCommissionRates":   (["salesMotion"], [], ["ASM Commission Rate %"]),
    "vwWinRates":          (["stage"], [], ["ASM Win Rate %"]),
    "vwStandardProfiles":  (["projectWeek", "dealSize"], [], ["ASM Standard Profile %"]),
    "vwImportSummary":     ([], [], SUMMARY_VALUES),
}

PAGE_DS = {
    "admin":    ["vwAssumptions", "vwScalarAssumptions", "vwCommissionRates", "vwWinRates",
                 "vwStandardProfiles", "vwImportSummary", "vwStageProps", "vwDealSizeProps",
                 "vwPigmentStageProps", "vwAttachProps", "vwSalesPersonProps",
                 "vwUseCaseProps", "vwPigmentAEProps"],
    "newDeal":  ["vwAssumptions", "vwScalarAssumptions", "vwCommissionRates", "vwImportSummary",
                 "vwStageProps", "vwDealSizeProps"],
    "pipeline": ["vwPipelineGrid", "vwProfileByDeal", "vwScalarAssumptions", "vwImportSummary",
                 "vwStageProps", "vwDealSizeProps", "vwPigmentGrid"],
    "deal":     ["vwPipelineGrid", "vwProfileByDeal", "vwScalarAssumptions", "vwImportSummary",
                 "vwStageProps", "vwDealSizeProps", "vwPigmentGrid"],
    "matching": ["vwPipelineGrid", "vwPigmentGrid", "vwImportSummary", "vwAssumptions",
                 "vwStageProps", "vwUseCaseProps", "vwSalesPersonProps",
                 "vwDealSizeProps"],
    "forecast": ["vwForecast", "vwPipelineGrid", "vwImportSummary", "vwStageProps"],
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
    # dsName -> the column names, in the order the data source returns values.
    # The Frames need this because the new payload is row-major: each row is
    # {labels, values} with no column labels of its own (D17).
    ds_columns = {}
    # logical data source -> its physical per-type parts
    ds_parts = {}

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

        def add_prop(al):
            if al in seen:
                return
            seen.add(al)
            list_alias, technical, _display = PROPS[al]
            binds.append({"name": al, "type": "ListProperty", "listId": L[list_alias],
                          "listPropertyTechnicalName": technical,
                          "canRead": True, "canWrite": False})

        for al, w in PAGE_LISTS[page]:
            add_list(al, w)

        ds_list = []
        for ds_name in PAGE_DS[page]:
            labels, selectors, values = DS[ds_name]
            for dim in labels + selectors:
                add_list(dim, 0)
            # One physical source per value type; the Frame subscribes to the
            # logical name and the shared layer joins the parts on their row
            # labels (D18).
            by_type = collections.OrderedDict()
            for value in values:
                if value in PROPS:
                    # A list property: one value per item, so no aggregation is
                    # meaningful; First is the only honest choice.
                    add_prop(value)
                    list_alias, _technical, display = PROPS[value]
                    entry = ({"binding": value, "aggregator": "First"}, display)
                    add_list(list_alias, 0)
                else:
                    a = alias(value)
                    add_metric(a, M[value], a in PAGE_WRITES[page])
                    entry = ({"binding": a, "aggregator": "Sum"}, value)
                by_type.setdefault(value_type(value), []).append(entry)

            parts = []
            for vtype, entries in by_type.items():
                part_name = ds_name + "__" + vtype
                ds_columns[part_name] = [display for _v, display in entries]
                parts.append(part_name)
                ds_list.append({
                    "name": part_name,
                    "labels": [{"binding": d} for d in labels],
                    "selectors": [{"binding": d} for d in selectors],
                    "values": [v for v, _display in entries],
                })
            ds_parts[ds_name] = parts

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
    (HERE / "frames" / "src" / "dscolumns.json").write_text(json.dumps(ds_columns, indent=2))
    (HERE / "frames" / "src" / "dsparts.json").write_text(json.dumps(ds_parts, indent=2))
    for p in PAGES:
        print("  + %-9s %2d bindings, %d data sources" % (p, len(bindings[p]), len(datasources[p])))
    print("\nNo alias collisions, no duplicate bindings, every data source resolves.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

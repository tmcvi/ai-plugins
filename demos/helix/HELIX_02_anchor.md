# HELIX · Step 2 — The anchor  [CLAUDE via Pigment MCP · ~15 min]

**Precondition:** Step 1 is done. The app has the two transaction lists loaded unmodified.

**Purpose:** prove the evaluation criterion. Two extracts from different databases are merged on a
common identifier **inside Pigment**. The alignment is one auditable in-model formula, and there is
no warehouse or ETL. CRM uses `ACC-10042` and ERP uses `C10042`. They meet on a `Customer`
dimension.

## Operating rules
- Work **only** in the application Tom names, `HELIX | Bookings to Billings` by default. Touch
  nothing in any other app.
- Decide autonomously and never wait for input. Keep a short decision log and print it at the end.
- Validate every formula with `validate_formula` before applying it.
- Put new blocks in a Block folder named **`Anchor`**.

---

## 2.1 Inspect before building
Call `search_metrics_and_lists` with `show_details: true` and record the following:
- The **CRM list** (614 rows, has `account_id`) and the **ERP list** (2,699 rows, has
  `CustomerNumber`). Use their real names below; the defaults are `TL CRM Opportunities` and
  `TL ERP Invoice Lines`.
- The **type of `account_id`**: Text (expected) or Dimension (the wizard sometimes does this).
  This picks variant A or B in 2.4.
- Whether a **calendar** exists (`Month`, `Quarter`, `Year`).
- The dimension lists created by the wizard: `Segment`, `Industry`, `Owner`, `Country`, `Stage`,
  `Product`. Note their ids.

## 2.2 Calendar
If there's no `Month` dimension, run `calendar_create` covering **Jan-23 → Dec-27** (monthly, with
Quarter and Year). If one exists, reuse it and log its range.

## 2.3 Build the Customer dimension (union of both keysets, ERP-style keys)
1. Collect the distinct keys with `get_list_items` (limit 200, pages via `offset`):
   - CRM: `account_id` from the CRM list (or from the `Account` dimension, if variant B). Convert
     each to ERP style: `ACC-10042` → `C10042`.
   - ERP: `CustomerNumber` from the ERP list (about 14 pages).
   - De-duplicate locally with a short script in the scratchpad. **Expected: 123 distinct keys.**
2. `create_list`: dimension **`Customer`**, folder `Anchor`, unique Text property
   **`Customer Key`**.
3. `add_list_items`: all 123 keys in one call.
4. `create_list` dimension **`Source System`** with items `Both`, `CRM only`, `ERP only`.
5. Add the item **`Unassigned`** to the `Owner` dimension. ERP-only customers need an owner value.

## 2.4 The key alignment (the criterion)
**Variant A, `account_id` is Text (expected).** On the CRM list, add a Dimension → Customer
property **`Customer`**:
```
// Anchor: CRM key ACC-10042 -> ERP key C10042
ITEM(SUBSTITUTE('TL CRM Opportunities'.'account_id', "ACC-", "C"), 'Customer')
```
**Variant B, `account_id` became an `Account` dimension.** Put the formula on `Account`, keyed on
the property that holds `ACC-…`; last run that was `Name`, with display = account name:
```
// Anchor: CRM key ACC-10042 -> ERP key C10042
ITEM(SUBSTITUTE('Account'.'Name', "ACC-", "C"), 'Customer')
```
Then on the CRM list: `Customer = 'TL CRM Opportunities'.'account_id'.'Customer'`.

**ERP side.** On the ERP list, add a Dimension → Customer property **`Customer`**:
```
// ERP key is already in anchor format
ITEM('TL ERP Invoice Lines'.'CustomerNumber', 'Customer')
```
**Month mappings.** Dimension → Month properties `Close Month` on CRM and `Invoice Month` on ERP:
```
TIMEDIM('TL CRM Opportunities'.'close_date', 'Month')
TIMEDIM('TL ERP Invoice Lines'.'InvoiceDate', 'Month')
```

## 2.5 Customer properties
Create these on `Customer` in this order, because later ones depend on earlier ones. The `BY`
aggregation pulls attributes back from the lists through the anchor.

| Property | Type | Formula |
|---|---|---|
| `CRM Key` | Text | `'TL CRM Opportunities'.'account_id'[BY FIRSTNONBLANK: 'TL CRM Opportunities'.'Customer']` (variant B: `'Account'.'Name'[BY FIRSTNONBLANK: 'Account'.'Customer']`) |
| `CRM Name` | Text | `'TL CRM Opportunities'.'account_name'[BY FIRSTNONBLANK: 'TL CRM Opportunities'.'Customer']` |
| `ERP Name` | Text | `'TL ERP Invoice Lines'.'CustomerName'[BY FIRSTNONBLANK: 'TL ERP Invoice Lines'.'Customer']` |
| `Name` | Text | `IFBLANK('Customer'.'CRM Name', 'Customer'.'ERP Name')` (CRM spelling preferred) |
| `Segment` | Dim → Segment | `'TL CRM Opportunities'.'segment'[BY FIRSTNONBLANK: 'TL CRM Opportunities'.'Customer']` |
| `Industry` | Dim → Industry | same pattern on `industry` |
| `Country` | Dim → Country | same pattern on `country` |
| `Owner` | Dim → Owner | `IFBLANK(<same pattern on owner>, ITEM("Unassigned", 'Owner'))` |
| `Source System` | Dim → Source System | see below |

```
// Join coverage: is the key present in CRM, ERP, or both?
IF(ISNOTBLANK('Customer'.'CRM Key') AND ISNOTBLANK('Customer'.'ERP Name'), ITEM("Both", 'Source System'),
  IF(ISNOTBLANK('Customer'.'CRM Key'), ITEM("CRM only", 'Source System'),
    IF(ISNOTBLANK('Customer'.'ERP Name'), ITEM("ERP only", 'Source System'))))
```
Keep `Customer Key` as the display property. It's unique, and names are not.

## 2.6 Check metrics (folder `Anchor`)
- **`CHK Customers by Source System`**, Integer, dims `[Source System]`:
  `IF(ISNOTBLANK('Customer'.'Customer Key'), 1)[BY SUM: 'Customer'.'Source System']`
- **`CHK Unmapped Rows`**, Integer, scalar:
  `IF(ISBLANK('TL ERP Invoice Lines'.'Customer'),1,0)[REMOVE SUM: 'TL ERP Invoice Lines'] + IF(ISBLANK('TL CRM Opportunities'.'Customer'),1,0)[REMOVE SUM: 'TL CRM Opportunities']`

Run `query_data` on both. They must return **116 / 4 / 3** and **0**. If unmapped is above 0, page
the offending list for rows with a blank `Customer`, add the missing keys to `Customer`, and
re-check.

## Known gotchas (from the first build)
- `ITEM(text, 'Customer')` resolves against the unique display property. That's why `Customer Key`
  must stay unique and be the display property.
- `TIMEDIM(date, 'Month')` is the clean way to map a Date onto the calendar.
- `query_data` is the fastest way to read a check metric back.

## Finish
Print:
1. The anchor formula as applied (one line). This is the demo's money shot.
2. The 116 / 4 / 3 split and the unmapped count.
3. The names of the 7 unmatched customers with their keys.
4. The decision log.
5. The hand-off line for Tom:
   `Read demos/helix/HELIX_03_calcs_and_board.md in full and execute it against "HELIX | Bookings to Billings".`

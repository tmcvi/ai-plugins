# HELIX · Step 1 — App creation & data load  [TOM · ~15 min, in the Pigment UI]

**Who runs this:** Tom, by hand. This is the "native product" part of the story: a human loads two
database extracts exactly as exported; Claude does the modelling afterwards (Steps 2–4).

**Talk track:** *"Two systems, two conventions, zero preparation — the files land as the databases
emitted them."*

---

## 1.1 Create the application
- Workspace: **Viridian**. New, empty application named **`HELIX | Bookings to Billings`**.
- Keep it separate from NOKIA and from the first `Helix` test app (delete or ignore that one — Steps 2–4
  only ever work in the app you name when you kick them off).

## 1.2 Import the CRM extract
Native CSV import of `helix_crm_opportunities.csv` → new **transaction list** `TL CRM Opportunities`.
**No edits to the file.**

| Column | Type in the wizard | Notes |
|---|---|---|
| `opportunity_id` | Text (unique) | Display property |
| `account_id` | **Text** | Keep raw — the anchor formula (Step 2) aligns it. Do **not** let the wizard turn it into a dimension. |
| `account_name` | Text | |
| `amount_eur` | Number | |
| `created_date`, `close_date` | Date | ISO, auto-detects |
| `stage`, `segment`, `industry`, `owner`, `country`, `product_line` | **Dimension** (let the wizard create the lists) | These become slicing attributes; Step 2 reuses them. |

If the wizard offers to create a calendar from the date columns, accept it (Month / Quarter / Year).
If it doesn't, Step 2 creates one.

## 1.3 Import the ERP extract
Native CSV import of `helix_erp_invoice_lines.csv` → new **transaction list** `TL ERP Invoice Lines`.
**No edits to the file.**

| Column | Type in the wizard | Notes |
|---|---|---|
| `CustomerNumber` | **Text** | Keep raw — keys stay as the ERP emitted them (`C10042`). |
| `CustomerName` | Text | |
| `InvoiceDate` | Date — **set the format to `dd/mm/yyyy` explicitly** | The deliberate "different database" friction the wizard absorbs. |
| `Quantity`, `UnitPrice`, `LineAmount`, `CostAmount` | Number | |
| `InvoiceNo`, `ItemCode` | Dimension or Text (either is fine) | Not used by the anchor. |
| `ItemDescription` | Text | |

## 1.4 Sanity check before handing over
- `TL CRM Opportunities` = **614** rows.
- `TL ERP Invoice Lines` = **2,699** rows.
- Spot-check one ERP row: `InvoiceDate` shows a real date (not blank, not month/day swapped).

## 1.5 Hand over to Claude
Start a Claude session with the Pigment connector and paste:

```
Read demos/helix/HELIX_02_anchor.md in full and execute it against the Pigment
application "HELIX | Bookings to Billings". Touch nothing in any other application.
```

### If the wizard did something different
Not a problem — Step 2 inspects the lists before it builds. Typical variations it handles:
list names differ, `account_id` became a dimension, no calendar was created. Just tell Claude the
app name.

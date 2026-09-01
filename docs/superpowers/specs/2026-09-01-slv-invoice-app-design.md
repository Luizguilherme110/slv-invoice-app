# SLV Invoice App — Design Spec

## Purpose

Standalone Windows desktop app for SLV Cleaning Services to emit client
invoices, replacing manual entry in the `BM - SLV Cleaning Services.xlsx`
spreadsheet's "Invoice" tab. The end user has low technical/Excel skill,
so the tool must require no installation and no configuration beyond
filling a single form.

## Scope

**In scope:**
- One form: company (From), client (Bill to), invoice meta fields,
  itemized line items, computed total.
- Export the filled invoice as PDF and/or as XLSX, mirroring the layout
  of the original spreadsheet's "Invoice" tab.
- Auto-incrementing invoice number, persisted locally between runs.
- Packaged as a single `.exe` (PyInstaller), no Python install required
  on the target machine.

**Out of scope (explicitly deferred/rejected during brainstorming):**
- No timesheet / "Boletim de medição" entry or hour aggregation — line
  items are entered manually.
- No saved client list/database — client info is typed fresh each time.
- No invoice history — the app does not retain past invoices; the
  exported file is the record.
- No multi-user, no network/hosting — single local user, single machine.

## Architecture

Single Python application, four modules:

- `main.py` — app entry point, builds and runs the CustomTkinter window.
- `ui.py` — form layout, field widgets, dynamic line-item rows, total
  calculation, "Exportar PDF" / "Exportar Excel" actions, validation and
  error dialogs.
- `pdf_generator.py` — pure function(s): takes an `InvoiceData` object,
  returns/writes a PDF replicating the spreadsheet's Invoice tab layout
  (reportlab).
- `excel_generator.py` — pure function(s): takes the same `InvoiceData`,
  writes an `.xlsx` replicating the same layout (openpyxl).
- `storage.py` — get/increment the next invoice number, persisted as
  JSON at `%APPDATA%/SLVInvoice/config.json`.

`pdf_generator.py`, `excel_generator.py`, and `storage.py` have no UI
dependency — they take plain data in and produce a file out, so they're
unit-testable without driving the GUI.

## Data model

```
LineItem: description (str), price (float), qty (float)
  total = price * qty  (computed, not stored)

InvoiceData:
  from_name, from_phone, from_address (str, pre-filled defaults, editable)
  bill_to_name, bill_to_phone, bill_to_address (str)
  invoice_no (str/int, auto-filled from storage, editable)
  invoice_date (date, default: today)
  date_due (date, editable, no default computation)
  payment_method (str, free text)
  items: list[LineItem]
  total = sum(item.total for item in items)  (computed)
```

## UI

Single-window form, top to bottom:

1. **From** section — Name/Cellphone/Address, pre-filled with
   "SLV Cleaning Services" / "508-901-1384" / "69, Cato lane", editable.
2. **Bill to** section — Name/Cellphone/Address, blank.
3. **Invoice meta** — Invoice no. (auto, editable), Date of invoice
   (default today), Date due, Payment method (free text).
4. **Items** — table of rows: Description, Price, Qty, Total
   (read-only, computed live). "+ Adicionar linha" button; each row has
   a remove (✕) button. Starts with one blank row.
5. **Total** — sum of all row totals, read-only, large/bold.
6. **Actions** — "Exportar PDF" and "Exportar Excel" buttons side by
   side. Both run the same validation and data collection; each opens a
   native "Save As" dialog defaulting to
   `Invoice_{invoice_no}_{bill_to_name}.{ext}` in the Documents folder,
   then writes the file via the matching generator and opens it
   (`os.startfile`) so the user sees the result immediately.

**Validation** (on export, either format): `bill_to_name` non-empty,
at least one line item with non-empty description and numeric
price > 0 and qty > 0. Failures show a plain-language messagebox
listing what's missing/invalid; no data is cleared, nothing is written.

**Invoice number behavior**: the field is pre-filled from
`storage.peek_next()` on window open. The counter only advances
(`storage.commit_next()`) after a successful export (file written
without error, save dialog not cancelled) — a failed or cancelled
export does not burn a number. Both PDF and Excel exports of the *same*
form session advance the counter independently (exporting both formats
for the same invoice will consume two numbers) — acceptable since this
is an edge case the user is unlikely to hit and correcting it manually
(editing the invoice no. field) is trivial.

## Visual layout (both exports match this exactly, data filled in)

Reference: original "Invoice" tab of `BM - SLV Cleaning Services.xlsx`,
confirmed against a screenshot from the user. Fixed layout, not
user-configurable.

- **Header row**: SLV Cleaning Services logo (`assets/logo.png`) top
  left; bold black "Invoice" title, large, centered/right of the logo.
- **Left column, two stacked bordered tables**:
  - "Bill to:" (bold, ~15pt, no fill) header, then a 2-col bordered
    table: row labels **Name / Cellphone / Address** (bold) with the
    filled-in value beside each.
  - "From:" (bold, ~15pt, no fill) header below it, same 2-col bordered
    table shape, pre-filled with SLV Cleaning Services / 508-901-1384 /
    69, Cato lane.
- **Right column, one bordered 2-col table**, label cells filled with
  blue `#6D9EEB` (bold-looking header cells, matches the source
  spreadsheet exactly), value cells white: **Invoice no. / Date of
  invoice / Date Due / Payment Method / Amount**.
- **Items table**, full width, below both columns: header row filled
  `#6D9EEB` with **Description / Price / Qty / Total**; one bordered
  row per line item; Price and Total formatted as currency (`$0.00`).
- **Signature**: centered horizontal line near the bottom with
  "Signature" label beneath it, no default value.

Dates render as `DD/MM`. Amount/Price/Total render as `$#,##0.00`.

## PDF export (`pdf_generator.py`)

reportlab (platypus) builds the layout above on a single page: logo
image + title in a header table, Bill-to/From tables and the meta
table side by side (two-column outer table), items table below,
signature line at the bottom. Colors and structure fixed as specified
above — the goal is a PDF indistinguishable in layout from the original
spreadsheet's Invoice tab, populated with the entered data.

## Excel export (`excel_generator.py`)

openpyxl writes a single-sheet `.xlsx` reproducing the same visual
layout (logo anchored via `openpyxl.drawing.image.Image`, merged cells,
`#6D9EEB` fills on the same label/header cells, matching borders,
column widths, and number formats). It is a static populated copy of
the layout, not a formula-driven workbook — no SUMIF/lookups, since
there's no timesheet source to aggregate from.

## Storage (`storage.py`)

JSON file at `%APPDATA%/SLVInvoice/config.json`:
```json
{"next_invoice_no": 4}
```
Created with `next_invoice_no: 1` if missing. Directory created if
missing. No other state is persisted.

## Error handling

- Export wrapped in try/except; any failure (bad path, permission,
  library error) shows a messagebox with a plain-language message and
  leaves the form intact — never crashes silently.
- Numeric fields (price, qty) validated as parseable floats before
  building `InvoiceData`; non-numeric input is reported per-row.

## Packaging

`PyInstaller --onefile --windowed` producing a single `.exe`. Build
instructions documented in the project README. Target: Windows only
(matches the user's environment).

## Testing

- `pdf_generator.py`, `excel_generator.py`, `storage.py`: plain Python
  unit tests (pytest) against sample `InvoiceData` — file is created,
  total is correct, counter increments correctly, doesn't regress on
  missing config file.
- `ui.py`: manual smoke test (fill form, export both formats, verify
  PDF/Excel open and match totals) — GUI logic is not unit tested.

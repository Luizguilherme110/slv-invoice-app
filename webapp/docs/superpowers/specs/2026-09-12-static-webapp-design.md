# SLV Invoice — Static Web App Design Spec

## Purpose

Port the existing Windows desktop invoice generator (`app/`, CustomTkinter +
reportlab + openpyxl) to a static web app the client can run on a Chromebook,
where no `.exe` can be installed. Same form, same validation, same PDF and XLSX
layouts — a different shell around identical behaviour.

## Constraints that shaped the design

The app is opened from disk as `file:///.../webapp/index.html`. There is no
server, no build step at run time and no network. Chrome treats that page as an
opaque `null` origin, which rules out three things the obvious implementation
would have used:

1. **ES modules.** `<script type="module">` is blocked by CORS on `file://`.
   Every file in `js/` is therefore a plain script wrapped in an IIFE that hangs
   its exports off a single `window.SLV` namespace. `index.html` loads them in
   dependency order; the tests import them for their side effect and read the
   same namespace off `globalThis`.
2. **`fetch()` of local assets.** The logo cannot be fetched at run time, and a
   canvas drawn from a local `<img>` is tainted, so `jsPDF.addImage` could not
   read it back either. `scripts/embedLogo.mjs` downscales `assets/logo.png` to
   256x256 and writes it into `js/logoData.js` as a base64 data URI, which both
   generators consume. The page header still uses `<img src="assets/logo.png">`,
   which `file://` does allow.
3. **CDNs.** All three libraries are vendored into `vendor/` by
   `scripts/vendor.mjs`, copied out of `node_modules` at pinned versions.

## Libraries

| Need | Library | Version | Why |
| --- | --- | --- | --- |
| PDF | `jspdf` + `jspdf-autotable` | 4.2.1 / 5.0.8 | autotable draws bordered, filled tables, the role reportlab's Platypus `Table` played |
| XLSX | `exceljs` | 4.4.0 | the only maintained JS writer with fonts, borders, fills and embedded images (SheetJS needs the paid build for styling) |
| Tests | `vitest` + `jsdom` | dev only | never copied to the client's machine |

## Module map

Each module is a direct port of its Python counterpart.

| Web | Desktop | Notes |
| --- | --- | --- |
| `js/models.js` | `app/models.py` | `LineItem`, `InvoiceData`, `total`, `totalHours` |
| `js/dateInput.js` | `app/date_input.py` | `formatRange`, `formatDateDigits` |
| `js/invoiceBuilder.js` | `app/invoice_builder.py` | `validate`, `buildInvoiceData`, `suggestedFilename` |
| `js/storage.js` | `app/storage.py` | `localStorage` key `slv_invoice_next_no` replaces `%APPDATA%/SLVInvoice/config.json` |
| `js/pdfGenerator.js` | `app/pdf_generator.py` | same letter page, margins, column widths and `#6D9EEB` fills |
| `js/excelGenerator.js` | `app/excel_generator.py` | same cell addresses, column widths, number formats |
| `js/ui.js` | `app/ui.py` | builds the form in the DOM, live total, dynamic item rows |
| `js/app.js` | the export half of `app/ui.py` | validate → build → generate → download → renumber |
| `js/logoData.js` | `app/resources.py` | generated; the asset is inlined rather than located on disk |

## Behaviour differences from the desktop app

These are the only intentional deviations; everything else is a literal port.

- **Errors.** A red banner at the top of the form replaces
  `messagebox.showerror`. It lists every message and hides itself on the next
  valid export.
- **Saving.** There is no save dialog. The browser downloads the file under
  `suggestedFilename(...)` straight to the Downloads folder, and the app does not
  open it afterwards (no `os.startfile` equivalent).
- **Numbering persistence.** `localStorage` is scoped to the exact `file://`
  path. The counter survives closing and reopening *the same* `index.html`; a
  duplicated copy of the folder starts its own sequence at 1. The rule the
  desktop app used is unchanged otherwise: a hand-typed number wins, and the next
  invoice continues from it.
- **Storage failures are silent.** Blocked site data or a full quota falls back
  to 1 and never blocks an export.

## Export flow

1. `ui.getForm()` collects the fields, including every non-blank item row.
2. `invoiceBuilder.validate(form)` runs the same five rules as the desktop app:
   client name required, hourly rate numeric and greater than zero, at least one
   item, each item's client required, each item's hours numeric and greater than
   zero. Any error aborts the export and fills the banner.
3. `invoiceBuilder.buildInvoiceData(form)` produces the `InvoiceData`.
4. The generator returns a `Uint8Array`; `app.downloadBytes` wraps it in a `Blob`
   and clicks a temporary `<a download>`.
5. `ui.registerExport(invoiceNo)` stores `invoiceNo + 1` (or advances the stored
   sequence when the number is not an integer) and refreshes the field.

A generator that throws is reported in the banner and does **not** consume an
invoice number.

## Testing

`npm test` runs Vitest against jsdom; nothing in `tests/` ships to the client.
The six Python suites are ported case for case, plus two suites the desktop app
had no equivalent of:

- `tests/ui.test.js` — form rendering, live total, item rows, date autoformat,
  error banner, renumbering.
- `tests/page.test.js` — loads `index.html` in jsdom with `runScripts`, which
  exercises the real vendored UMD bundles and the real script order, then exports
  a genuine PDF and a genuine xlsx through them.

The generator suites assert on content, not pixels: the PDF is checked by
extracting its text literals, the xlsx by loading it back with ExcelJS and
reading values, number formats, borders, fills and the embedded image.

## Distribution

`npm run bundle` (`scripts/bundle.mjs`) inlines the stylesheet, the three vendored
libraries, every app module, the favicon and the logo into a single
`dist/SLV-Invoice.html` of roughly 1.7 MB — smaller than the folder it replaces,
because the full-resolution `assets/logo.png` is dropped in favour of the 256px
data URI the generators already carry. That one file is what the client receives;
it depends on no sibling file and no network, which is as close to the old `.exe`
as a Chromebook allows.

`tests/bundle.test.js` writes the built file into an empty temporary directory
and drives it there, so a forgotten reference to a sibling file fails the suite
rather than the client's machine.

The unbundled folder (`index.html`, `css/`, `js/`, `vendor/`, `assets/`) still
works and stays the development target.

Either way the client opens the page once and uses Chrome's ⋮ → More tools →
Create shortcut, with "Open as window" ticked, to get a launcher icon. See
`README.md`.

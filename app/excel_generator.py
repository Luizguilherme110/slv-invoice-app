from pathlib import Path

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from app.models import InvoiceData
from app.resources import resource_path

SLV_BLUE = "FF6D9EEB"
CURRENCY_FORMAT = '"$"#,##0.00'
THIN = Side(style="thin", color="000000")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def _label_cell(ws, coord, text):
    cell = ws[coord]
    cell.value = text
    cell.font = Font(bold=True)
    cell.border = BORDER
    return cell


def _value_cell(ws, coord, value, number_format=None):
    cell = ws[coord]
    cell.value = value
    cell.border = BORDER
    if number_format:
        cell.number_format = number_format
    return cell


def _blue_label_cell(ws, coord, text):
    cell = ws[coord]
    cell.value = text
    cell.font = Font(bold=True)
    cell.fill = PatternFill("solid", fgColor=SLV_BLUE)
    cell.border = BORDER
    return cell


def generate_excel(invoice: InvoiceData, out_path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Invoice"

    for col, width in {"A": 4, "B": 14, "C": 20, "D": 14, "E": 10, "F": 14}.items():
        ws.column_dimensions[col].width = width

    logo_path = resource_path("assets", "logo.png")
    if logo_path.exists():
        img = XLImage(str(logo_path))
        img.width = 90
        img.height = 90
        ws.add_image(img, "A1")

    ws.merge_cells("C1:F2")
    title_cell = ws["C1"]
    title_cell.value = "Invoice"
    title_cell.font = Font(bold=True, size=28)
    title_cell.alignment = Alignment(horizontal="center", vertical="center")

    _label_cell(ws, "B5", "Bill to:").font = Font(bold=True, size=15)
    ws["B5"].border = None
    _label_cell(ws, "B6", "Name")
    _value_cell(ws, "C6", invoice.bill_to_name)
    _label_cell(ws, "B7", "Cellphone")
    _value_cell(ws, "C7", invoice.bill_to_phone)
    _label_cell(ws, "B8", "Address")
    _value_cell(ws, "C8", invoice.bill_to_address)

    _label_cell(ws, "B11", "From:").font = Font(bold=True, size=15)
    ws["B11"].border = None
    _label_cell(ws, "B12", "Name")
    _value_cell(ws, "C12", invoice.from_name)
    _label_cell(ws, "B13", "Cellphone")
    _value_cell(ws, "C13", invoice.from_phone)
    _label_cell(ws, "B14", "Address")
    _value_cell(ws, "C14", invoice.from_address)

    meta_rows = [
        ("Invoice no.", invoice.invoice_no, None),
        ("Date of invoice", invoice.invoice_date, None),
        ("Date Due", invoice.date_due, None),
        ("Payment Method", invoice.payment_method, None),
        ("Valor/hora", invoice.hourly_rate, CURRENCY_FORMAT),
        ("Amount", invoice.total, CURRENCY_FORMAT),
    ]
    for offset, (label, value, fmt) in enumerate(meta_rows):
        row = 5 + offset * 2
        _blue_label_cell(ws, f"D{row}", label)
        _value_cell(ws, f"E{row}", value, fmt)

    header_row = 21
    headers = ["Data", "Cliente", "Amount"]
    for col_index, header in enumerate(headers):
        col_letter = get_column_letter(3 + col_index)
        _blue_label_cell(ws, f"{col_letter}{header_row}", header)

    for row_offset, item in enumerate(invoice.items):
        row = header_row + 1 + row_offset
        _value_cell(ws, f"C{row}", item.date)
        _value_cell(ws, f"D{row}", item.client)
        _value_cell(ws, f"E{row}", item.hours)

    signature_row = header_row + len(invoice.items) + 3
    ws.merge_cells(f"C{signature_row}:D{signature_row}")
    ws[f"C{signature_row}"].border = Border(bottom=THIN)
    label_row = signature_row + 1
    ws[f"C{label_row}"].value = "Signature"
    ws[f"C{label_row}"].alignment = Alignment(horizontal="center")

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)

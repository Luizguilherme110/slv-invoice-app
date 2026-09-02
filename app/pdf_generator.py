from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.models import InvoiceData
from app.resources import resource_path

SLV_BLUE = colors.HexColor("#6D9EEB")
GRID = TableStyle(
    [
        ("GRID", (0, 0), (-1, -1), 0.75, colors.black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
)


def _party_table(title, name, phone, address, styles):
    header = Paragraph(title, styles["party_title"])
    grid = Table(
        [["Name", name], ["Cellphone", phone], ["Address", address]],
        colWidths=[1.1 * inch, 2.2 * inch],
    )
    grid.setStyle(
        TableStyle(
            [
                *GRID.getCommands(),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ]
        )
    )
    return [header, Spacer(1, 4), grid]


def _meta_table(invoice, styles):
    rows = [
        ["Invoice no.", str(invoice.invoice_no)],
        ["Date of invoice", invoice.invoice_date],
        ["Date Due", invoice.date_due],
        ["Payment Method", invoice.payment_method],
        ["Hourly rate", f"${invoice.hourly_rate:,.2f}"],
        ["Amount", f"${invoice.total:,.2f}"],
    ]
    table = Table(rows, colWidths=[1.7 * inch, 1.7 * inch])
    table.setStyle(
        TableStyle(
            [
                *GRID.getCommands(),
                ("BACKGROUND", (0, 0), (0, -1), SLV_BLUE),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ]
        )
    )
    return table


def _items_table(invoice):
    header = ["Date", "Client", "Amount"]
    rows = [header]
    for item in invoice.items:
        rows.append([item.date, item.client, f"{item.hours:g}"])
    table = Table(rows, colWidths=[1.5 * inch, 3.2 * inch, 1.5 * inch])
    table.setStyle(
        TableStyle(
            [
                *GRID.getCommands(),
                ("BACKGROUND", (0, 0), (-1, 0), SLV_BLUE),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    return table


def generate_pdf(invoice: InvoiceData, out_path: Path) -> None:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    styles = {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=28),
        "party_title": ParagraphStyle(
            "party_title", fontName="Helvetica-Bold", fontSize=15
        ),
    }

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=letter,
        leftMargin=0.6 * inch,
        rightMargin=0.6 * inch,
        topMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )

    elements = []

    logo_path = resource_path("assets", "logo.png")
    logo_cell = Image(str(logo_path), width=0.9 * inch, height=0.9 * inch) if logo_path.exists() else ""
    header_table = Table(
        [[logo_cell, Paragraph("Invoice", styles["title"])]],
        colWidths=[1.2 * inch, 5.7 * inch],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ]
        )
    )
    elements.append(header_table)
    elements.append(Spacer(1, 20))

    left_column = [
        *_party_table(
            "Bill to:",
            invoice.bill_to_name,
            invoice.bill_to_phone,
            invoice.bill_to_address,
            styles,
        ),
        Spacer(1, 14),
        *_party_table(
            "From:", invoice.from_name, invoice.from_phone, invoice.from_address, styles
        ),
    ]
    top_table = Table(
        [[left_column, _meta_table(invoice, styles)]],
        colWidths=[3.6 * inch, 3.4 * inch],
    )
    top_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(top_table)
    elements.append(Spacer(1, 24))

    elements.append(_items_table(invoice))

    doc.build(elements)

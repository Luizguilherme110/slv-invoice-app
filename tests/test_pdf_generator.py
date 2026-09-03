from pypdf import PdfReader

from app.models import InvoiceData, LineItem
from app.pdf_generator import generate_pdf


def _sample_invoice():
    return InvoiceData(
        from_name="SLV Cleaning Services",
        from_phone="508-901-1384",
        from_address="69, Cato lane",
        bill_to_name="Kristin Paton",
        bill_to_phone="555-1234",
        bill_to_address="1 Main St",
        invoice_no="3",
        date_from="01/04/2026",
        date_to="07/04/2026",
        week_from="08/04/2026",
        week_to="14/04/2026",
        payment_method="Cash",
        hourly_rate=35.0,
        items=[
            LineItem(date="01/04/2026", client="11 pleasant", hours=4.0),
            LineItem(date="02/04/2026", client="Caren", hours=1.0),
        ],
    )


def _text_of(path):
    return PdfReader(str(path)).pages[0].extract_text()


def test_generate_pdf_creates_a_readable_pdf_file(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    assert out_path.exists()
    assert len(PdfReader(str(out_path)).pages) == 1


def test_generate_pdf_includes_client_and_item_data(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    text = _text_of(out_path)
    assert "Kristin Paton" in text
    assert "11 pleasant" in text
    assert "175.00" in text


def test_generate_pdf_shows_date_and_week_ranges(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    text = _text_of(out_path)
    assert "Week" in text
    assert "01/04/2026 - 07/04/2026" in text
    assert "08/04/2026 - 14/04/2026" in text


def test_generate_pdf_shows_hourly_rate_and_total_hours(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    text = _text_of(out_path)
    assert "35.00" in text
    assert "Total hours" in text
    assert "5" in text


def test_generate_pdf_item_headers_are_date_client_amount(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    text = _text_of(out_path)
    assert "Client" in text
    assert "Amount" in text

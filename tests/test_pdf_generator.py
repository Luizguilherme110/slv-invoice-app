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
        invoice_date="30/05",
        date_due="10/06",
        payment_method="Cash",
        hourly_rate=35.0,
        items=[
            LineItem(date="01/04", client="11 pleasant", hours=4.0),
            LineItem(date="02/04", client="Caren", hours=1.0),
        ],
    )


def test_generate_pdf_creates_a_readable_pdf_file(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    assert out_path.exists()
    reader = PdfReader(str(out_path))
    assert len(reader.pages) == 1


def test_generate_pdf_includes_client_and_item_data(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    reader = PdfReader(str(out_path))
    text = reader.pages[0].extract_text()

    assert "Kristin Paton" in text
    assert "11 pleasant" in text
    assert "01/04" in text
    assert "175.00" in text


def test_generate_pdf_shows_hourly_rate_and_item_headers(tmp_path):
    out_path = tmp_path / "invoice.pdf"
    generate_pdf(_sample_invoice(), out_path)

    reader = PdfReader(str(out_path))
    text = reader.pages[0].extract_text()

    assert "35.00" in text
    assert "Data" in text
    assert "Cliente" in text
    assert "Amount" in text

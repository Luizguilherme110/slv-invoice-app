import pytest

from app.invoice_builder import build_invoice_data, suggested_filename, validate


def _valid_form():
    return {
        "from_name": "SLV Cleaning Services",
        "from_phone": "508-901-1384",
        "from_address": "69, Cato lane",
        "bill_to_name": "Kristin Paton",
        "bill_to_phone": "555-1234",
        "bill_to_address": "1 Main St",
        "invoice_no": "3",
        "invoice_date": "30/05",
        "date_due": "10/06",
        "payment_method": "Cash",
        "items": [
            {"description": "Deep clean", "price": "35", "qty": "4"},
        ],
    }


def test_validate_returns_no_errors_for_a_valid_form():
    assert validate(_valid_form()) == []


def test_validate_requires_bill_to_name():
    form = _valid_form()
    form["bill_to_name"] = "  "
    errors = validate(form)
    assert any("cliente" in e.lower() for e in errors)


def test_validate_requires_at_least_one_item():
    form = _valid_form()
    form["items"] = []
    errors = validate(form)
    assert any("item" in e.lower() for e in errors)


def test_validate_rejects_non_numeric_price():
    form = _valid_form()
    form["items"] = [{"description": "Deep clean", "price": "abc", "qty": "4"}]
    errors = validate(form)
    assert any("preço" in e.lower() or "preco" in e.lower() for e in errors)


def test_validate_rejects_zero_qty():
    form = _valid_form()
    form["items"] = [{"description": "Deep clean", "price": "35", "qty": "0"}]
    errors = validate(form)
    assert any("qtd" in e.lower() or "quantidade" in e.lower() for e in errors)


def test_validate_ignores_blank_trailing_rows():
    form = _valid_form()
    form["items"].append({"description": "", "price": "", "qty": ""})
    assert validate(form) == []


def test_build_invoice_data_converts_items_and_skips_blank_rows():
    form = _valid_form()
    form["items"].append({"description": "", "price": "", "qty": ""})

    invoice = build_invoice_data(form)

    assert invoice.bill_to_name == "Kristin Paton"
    assert len(invoice.items) == 1
    assert invoice.items[0].total == 140.0
    assert invoice.total == 140.0


def test_suggested_filename_sanitizes_client_name():
    name = suggested_filename(invoice_no="3", bill_to_name="Kristin/Paton?", ext="pdf")
    assert name == "Invoice_3_Kristin_Paton.pdf"

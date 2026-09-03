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
        "date_from": "01/04/2026",
        "date_to": "07/04/2026",
        "week_from": "01/04/2026",
        "week_to": "07/04/2026",
        "payment_method": "Cash",
        "hourly_rate": "35",
        "items": [
            {"date": "01/04/2026", "client": "11 pleasant", "hours": "4"},
        ],
    }


def test_validate_returns_no_errors_for_a_valid_form():
    assert validate(_valid_form()) == []


def test_validate_requires_bill_to_name():
    form = _valid_form()
    form["bill_to_name"] = "  "
    errors = validate(form)
    assert any("client" in e.lower() for e in errors)


def test_validate_requires_at_least_one_item():
    form = _valid_form()
    form["items"] = []
    errors = validate(form)
    assert any("item" in e.lower() for e in errors)


def test_validate_requires_hourly_rate():
    form = _valid_form()
    form["hourly_rate"] = ""
    errors = validate(form)
    assert any("hourly rate" in e.lower() for e in errors)


def test_validate_rejects_zero_hourly_rate():
    form = _valid_form()
    form["hourly_rate"] = "0"
    errors = validate(form)
    assert any("hourly rate" in e.lower() for e in errors)


def test_validate_requires_item_client():
    form = _valid_form()
    form["items"] = [{"date": "01/04/2026", "client": "", "hours": "4"}]
    errors = validate(form)
    assert any("client" in e.lower() for e in errors)


def test_validate_rejects_zero_hours():
    form = _valid_form()
    form["items"] = [{"date": "01/04/2026", "client": "11 pleasant", "hours": "0"}]
    errors = validate(form)
    assert any("amount" in e.lower() for e in errors)


def test_validate_rejects_non_numeric_hours():
    form = _valid_form()
    form["items"] = [{"date": "01/04/2026", "client": "11 pleasant", "hours": "abc"}]
    errors = validate(form)
    assert any("amount" in e.lower() for e in errors)


def test_validate_ignores_blank_trailing_rows():
    form = _valid_form()
    form["items"].append({"date": "", "client": "", "hours": ""})
    assert validate(form) == []


def test_build_invoice_data_carries_date_and_week_ranges():
    invoice = build_invoice_data(_valid_form())

    assert invoice.date_from == "01/04/2026"
    assert invoice.date_to == "07/04/2026"
    assert invoice.week_from == "01/04/2026"
    assert invoice.week_to == "07/04/2026"


def test_build_invoice_data_converts_items_and_skips_blank_rows():
    form = _valid_form()
    form["items"].append({"date": "", "client": "", "hours": ""})

    invoice = build_invoice_data(form)

    assert invoice.bill_to_name == "Kristin Paton"
    assert invoice.hourly_rate == 35.0
    assert len(invoice.items) == 1
    assert invoice.total == 140.0
    assert invoice.total_hours == 4.0


def test_suggested_filename_sanitizes_client_name():
    name = suggested_filename(invoice_no="3", bill_to_name="Kristin/Paton?", ext="pdf")
    assert name == "Invoice_3_Kristin_Paton.pdf"

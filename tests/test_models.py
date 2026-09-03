from app.models import LineItem, InvoiceData


def _invoice(**overrides):
    defaults = dict(
        from_name="SLV Cleaning Services",
        from_phone="508-901-1384",
        from_address="69, Cato lane",
        bill_to_name="Kristin Paton",
        bill_to_phone="",
        bill_to_address="",
        invoice_no="1",
        date_from="01/04/2026",
        date_to="07/04/2026",
        week_from="01/04/2026",
        week_to="07/04/2026",
        payment_method="Cash",
        hourly_rate=35.0,
        items=[],
    )
    defaults.update(overrides)
    return InvoiceData(**defaults)


def test_line_item_amount_is_hours_times_hourly_rate():
    item = LineItem(date="01/04/2026", client="11 pleasant", hours=3.0)
    assert item.amount(hourly_rate=35.0) == 105.0


def test_invoice_total_sums_all_line_item_amounts_at_the_invoice_hourly_rate():
    invoice = _invoice(
        items=[
            LineItem(date="01/04/2026", client="11 pleasant", hours=4.0),
            LineItem(date="02/04/2026", client="Caren", hours=1.0),
        ]
    )
    assert invoice.total == 175.0


def test_invoice_total_hours_sums_hours_across_items():
    invoice = _invoice(
        items=[
            LineItem(date="01/04/2026", client="11 pleasant", hours=4.0),
            LineItem(date="02/04/2026", client="Caren", hours=1.5),
        ]
    )
    assert invoice.total_hours == 5.5


def test_invoice_totals_are_zero_with_no_items():
    invoice = _invoice(items=[])
    assert invoice.total == 0.0
    assert invoice.total_hours == 0.0


def test_invoice_keeps_both_ends_of_the_date_and_week_ranges():
    invoice = _invoice(
        date_from="01/04/2026",
        date_to="07/04/2026",
        week_from="08/04/2026",
        week_to="14/04/2026",
    )
    assert invoice.date_from == "01/04/2026"
    assert invoice.date_to == "07/04/2026"
    assert invoice.week_from == "08/04/2026"
    assert invoice.week_to == "14/04/2026"

from app.models import LineItem, InvoiceData


def test_line_item_amount_is_hours_times_hourly_rate():
    item = LineItem(date="01/04", client="11 pleasant", hours=3.0)
    assert item.amount(hourly_rate=35.0) == 105.0


def test_invoice_total_sums_all_line_item_amounts_at_the_invoice_hourly_rate():
    invoice = InvoiceData(
        from_name="SLV Cleaning Services",
        from_phone="508-901-1384",
        from_address="69, Cato lane",
        bill_to_name="Kristin Paton",
        bill_to_phone="",
        bill_to_address="",
        invoice_no="1",
        invoice_date="30/05",
        date_due="10/06",
        payment_method="Cash",
        hourly_rate=35.0,
        items=[
            LineItem(date="01/04", client="11 pleasant", hours=4.0),
            LineItem(date="02/04", client="Caren", hours=1.0),
        ],
    )
    assert invoice.total == 175.0


def test_invoice_total_is_zero_with_no_items():
    invoice = InvoiceData(
        from_name="SLV Cleaning Services",
        from_phone="508-901-1384",
        from_address="69, Cato lane",
        bill_to_name="Kristin Paton",
        bill_to_phone="",
        bill_to_address="",
        invoice_no="1",
        invoice_date="30/05",
        date_due="10/06",
        payment_method="Cash",
        hourly_rate=35.0,
        items=[],
    )
    assert invoice.total == 0.0


def test_invoice_total_changes_with_hourly_rate_not_per_item_price():
    item = LineItem(date="01/04", client="11 pleasant", hours=2.0)
    invoice_a = InvoiceData(
        from_name="", from_phone="", from_address="",
        bill_to_name="X", bill_to_phone="", bill_to_address="",
        invoice_no="1", invoice_date="", date_due="", payment_method="",
        hourly_rate=35.0, items=[item],
    )
    invoice_b = InvoiceData(
        from_name="", from_phone="", from_address="",
        bill_to_name="X", bill_to_phone="", bill_to_address="",
        invoice_no="1", invoice_date="", date_due="", payment_method="",
        hourly_rate=50.0, items=[item],
    )
    assert invoice_a.total == 70.0
    assert invoice_b.total == 100.0

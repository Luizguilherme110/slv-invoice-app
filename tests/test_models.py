from app.models import LineItem, InvoiceData


def test_line_item_total_is_price_times_qty():
    item = LineItem(description="11 pleasant", price=35.0, qty=3.0)
    assert item.total == 105.0


def test_invoice_total_sums_all_line_items():
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
        items=[
            LineItem(description="Deep clean", price=35.0, qty=4.0),
            LineItem(description="Fast clean", price=35.0, qty=1.0),
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
        items=[],
    )
    assert invoice.total == 0.0

import re

from app.models import InvoiceData, LineItem


def _is_blank_row(row: dict) -> bool:
    return not row.get("date", "").strip() and not row.get(
        "client", ""
    ).strip() and not row.get("hours", "").strip()


def validate(form: dict) -> list:
    errors = []

    if not form.get("bill_to_name", "").strip():
        errors.append("Enter the client's name.")

    try:
        hourly_rate = float(form.get("hourly_rate", ""))
        if hourly_rate <= 0:
            errors.append("Hourly rate must be greater than zero.")
    except ValueError:
        errors.append("Invalid hourly rate.")

    rows = [row for row in form.get("items", []) if not _is_blank_row(row)]
    if not rows:
        errors.append("Add at least one item.")

    for index, row in enumerate(rows, start=1):
        if not row.get("client", "").strip():
            errors.append(f"Item {index}: client is required.")

        try:
            hours = float(row.get("hours", ""))
            if hours <= 0:
                errors.append(f"Item {index}: Amount must be greater than zero.")
        except ValueError:
            errors.append(f"Item {index}: Invalid amount.")

    return errors


def build_invoice_data(form: dict) -> InvoiceData:
    items = []
    for row in form.get("items", []):
        if _is_blank_row(row):
            continue
        items.append(
            LineItem(
                date=row["date"].strip(),
                client=row["client"].strip(),
                hours=float(row["hours"]),
            )
        )

    return InvoiceData(
        from_name=form["from_name"],
        from_phone=form["from_phone"],
        from_address=form["from_address"],
        bill_to_name=form["bill_to_name"].strip(),
        bill_to_phone=form["bill_to_phone"],
        bill_to_address=form["bill_to_address"],
        invoice_no=form["invoice_no"],
        date_from=form["date_from"],
        date_to=form["date_to"],
        week_from=form["week_from"],
        week_to=form["week_to"],
        payment_method=form["payment_method"],
        hourly_rate=float(form["hourly_rate"]),
        items=items,
    )


def suggested_filename(invoice_no: str, bill_to_name: str, ext: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9]+", "_", bill_to_name).strip("_")
    return f"Invoice_{invoice_no}_{safe_name}.{ext}"

import re

from app.models import InvoiceData, LineItem


def _is_blank_row(row: dict) -> bool:
    return not row.get("date", "").strip() and not row.get(
        "client", ""
    ).strip() and not row.get("hours", "").strip()


def validate(form: dict) -> list:
    errors = []

    if not form.get("bill_to_name", "").strip():
        errors.append("Informe o nome do cliente.")

    try:
        hourly_rate = float(form.get("hourly_rate", ""))
        if hourly_rate <= 0:
            errors.append("Valor da hora deve ser maior que zero.")
    except ValueError:
        errors.append("Valor da hora inválido.")

    rows = [row for row in form.get("items", []) if not _is_blank_row(row)]
    if not rows:
        errors.append("Adicione ao menos um item.")

    for index, row in enumerate(rows, start=1):
        if not row.get("client", "").strip():
            errors.append(f"Item {index}: cliente obrigatório.")

        try:
            hours = float(row.get("hours", ""))
            if hours <= 0:
                errors.append(f"Item {index}: Amount deve ser maior que zero.")
        except ValueError:
            errors.append(f"Item {index}: Amount inválido.")

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
        invoice_date=form["invoice_date"],
        date_due=form["date_due"],
        payment_method=form["payment_method"],
        hourly_rate=float(form["hourly_rate"]),
        items=items,
    )


def suggested_filename(invoice_no: str, bill_to_name: str, ext: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9]+", "_", bill_to_name).strip("_")
    return f"Invoice_{invoice_no}_{safe_name}.{ext}"

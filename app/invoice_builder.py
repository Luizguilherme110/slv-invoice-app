import re

from app.models import InvoiceData, LineItem


def _is_blank_row(row: dict) -> bool:
    return not row.get("description", "").strip() and not row.get(
        "price", ""
    ).strip() and not row.get("qty", "").strip()


def validate(form: dict) -> list:
    errors = []

    if not form.get("bill_to_name", "").strip():
        errors.append("Informe o nome do cliente.")

    rows = [row for row in form.get("items", []) if not _is_blank_row(row)]
    if not rows:
        errors.append("Adicione ao menos um item.")

    for index, row in enumerate(rows, start=1):
        if not row.get("description", "").strip():
            errors.append(f"Item {index}: descrição obrigatória.")

        try:
            price = float(row.get("price", ""))
            if price <= 0:
                errors.append(f"Item {index}: preço deve ser maior que zero.")
        except ValueError:
            errors.append(f"Item {index}: preço inválido.")

        try:
            qty = float(row.get("qty", ""))
            if qty <= 0:
                errors.append(f"Item {index}: quantidade deve ser maior que zero.")
        except ValueError:
            errors.append(f"Item {index}: quantidade inválida.")

    return errors


def build_invoice_data(form: dict) -> InvoiceData:
    items = []
    for row in form.get("items", []):
        if _is_blank_row(row):
            continue
        items.append(
            LineItem(
                description=row["description"].strip(),
                price=float(row["price"]),
                qty=float(row["qty"]),
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
        items=items,
    )


def suggested_filename(invoice_no: str, bill_to_name: str, ext: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9]+", "_", bill_to_name).strip("_")
    return f"Invoice_{invoice_no}_{safe_name}.{ext}"

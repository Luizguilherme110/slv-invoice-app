import os
from datetime import date
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk

from app import storage
from app.excel_generator import generate_excel
from app.invoice_builder import build_invoice_data, suggested_filename, validate
from app.pdf_generator import generate_pdf

DEFAULT_FROM = {
    "name": "SLV Cleaning Services",
    "phone": "508-901-1384",
    "address": "69, Cato lane",
}

LABEL_FONT = ("Helvetica", 13, "bold")
SECTION_FONT = ("Helvetica", 16, "bold")


class ItemRow:
    def __init__(self, parent, on_change, on_remove):
        self.frame = ctk.CTkFrame(parent, fg_color="transparent")
        self.frame.pack(fill="x", pady=2)

        self.description = ctk.StringVar()
        self.price = ctk.StringVar()
        self.qty = ctk.StringVar()

        desc_entry = ctk.CTkEntry(
            self.frame, textvariable=self.description, placeholder_text="Descrição"
        )
        desc_entry.pack(side="left", fill="x", expand=True, padx=(0, 4))

        price_entry = ctk.CTkEntry(
            self.frame, textvariable=self.price, placeholder_text="Preço", width=90
        )
        price_entry.pack(side="left", padx=4)

        qty_entry = ctk.CTkEntry(
            self.frame, textvariable=self.qty, placeholder_text="Qtd", width=70
        )
        qty_entry.pack(side="left", padx=4)

        self.total_label = ctk.CTkLabel(self.frame, text="$0.00", width=90, anchor="e")
        self.total_label.pack(side="left", padx=4)

        remove_button = ctk.CTkButton(
            self.frame,
            text="✕",
            width=30,
            fg_color="#B33A3A",
            hover_color="#8C2E2E",
            command=lambda: on_remove(self),
        )
        remove_button.pack(side="left", padx=(4, 0))

        self.description.trace_add("write", lambda *_: on_change())
        self.price.trace_add("write", lambda *_: on_change())
        self.qty.trace_add("write", lambda *_: on_change())

    def as_dict(self):
        return {
            "description": self.description.get(),
            "price": self.price.get(),
            "qty": self.qty.get(),
        }

    def row_total(self):
        try:
            return float(self.price.get()) * float(self.qty.get())
        except ValueError:
            return 0.0

    def refresh_total_label(self):
        self.total_label.configure(text=f"${self.row_total():,.2f}")

    def destroy(self):
        self.frame.destroy()


class InvoiceApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("SLV Cleaning Services - Emissor de Invoice")
        self.geometry("820x760")

        self.item_rows = []
        self.config_path = storage.default_config_path()

        self._build_layout()
        self._add_item_row()

    def _build_layout(self):
        container = ctk.CTkScrollableFrame(self, label_text="")
        container.pack(fill="both", expand=True, padx=16, pady=16)

        ctk.CTkLabel(container, text="Nova Invoice", font=("Helvetica", 22, "bold")).pack(
            anchor="w", pady=(0, 12)
        )

        top_row = ctk.CTkFrame(container, fg_color="transparent")
        top_row.pack(fill="x")

        bill_to_frame = ctk.CTkFrame(top_row)
        bill_to_frame.pack(side="left", fill="both", expand=True, padx=(0, 8))
        self.bill_to_name, self.bill_to_phone, self.bill_to_address = self._build_party_section(
            bill_to_frame, "Bill to:", ("", "", "")
        )

        meta_frame = ctk.CTkFrame(top_row)
        meta_frame.pack(side="left", fill="both", expand=True, padx=(8, 0))
        self._build_meta_section(meta_frame)

        from_frame = ctk.CTkFrame(container)
        from_frame.pack(fill="x", pady=(12, 0))
        self.from_name, self.from_phone, self.from_address = self._build_party_section(
            from_frame,
            "From:",
            (DEFAULT_FROM["name"], DEFAULT_FROM["phone"], DEFAULT_FROM["address"]),
        )

        ctk.CTkLabel(container, text="Itens", font=SECTION_FONT).pack(
            anchor="w", pady=(20, 4)
        )
        self.items_container = ctk.CTkFrame(container, fg_color="transparent")
        self.items_container.pack(fill="x")

        ctk.CTkButton(
            container, text="+ Adicionar item", command=self._add_item_row
        ).pack(anchor="w", pady=(8, 0))

        self.total_label = ctk.CTkLabel(
            container, text="Total: $0.00", font=("Helvetica", 20, "bold")
        )
        self.total_label.pack(anchor="e", pady=(20, 8))

        buttons_frame = ctk.CTkFrame(container, fg_color="transparent")
        buttons_frame.pack(fill="x", pady=(8, 0))
        ctk.CTkButton(
            buttons_frame,
            text="Exportar PDF",
            height=44,
            font=("Helvetica", 14, "bold"),
            command=lambda: self._on_export("pdf"),
        ).pack(side="left", fill="x", expand=True, padx=(0, 6))
        ctk.CTkButton(
            buttons_frame,
            text="Exportar Excel",
            height=44,
            font=("Helvetica", 14, "bold"),
            command=lambda: self._on_export("xlsx"),
        ).pack(side="left", fill="x", expand=True, padx=(6, 0))

    def _build_party_section(self, parent, title, defaults):
        ctk.CTkLabel(parent, text=title, font=SECTION_FONT).pack(
            anchor="w", padx=12, pady=(10, 6)
        )
        name_var = self._labeled_entry(parent, "Nome", defaults[0])
        phone_var = self._labeled_entry(parent, "Telefone", defaults[1])
        address_var = self._labeled_entry(parent, "Endereço", defaults[2])
        return name_var, phone_var, address_var

    def _labeled_entry(self, parent, label, default_value):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=12, pady=4)
        ctk.CTkLabel(row, text=label, font=LABEL_FONT, width=90, anchor="w").pack(
            side="left"
        )
        var = ctk.StringVar(value=default_value)
        ctk.CTkEntry(row, textvariable=var).pack(side="left", fill="x", expand=True)
        return var

    def _build_meta_section(self, parent):
        ctk.CTkLabel(parent, text="Dados da invoice", font=SECTION_FONT).pack(
            anchor="w", padx=12, pady=(10, 6)
        )
        next_number = storage.peek_next_invoice_number(self.config_path)
        self.invoice_no = self._labeled_entry(parent, "Invoice no.", str(next_number))
        self.invoice_date = self._labeled_entry(
            parent, "Data invoice", date.today().strftime("%d/%m")
        )
        self.date_due = self._labeled_entry(parent, "Vencimento", "")
        self.payment_method = self._labeled_entry(parent, "Pagamento", "Cash")

    def _add_item_row(self):
        row = ItemRow(self.items_container, self._recalculate_total, self._remove_item_row)
        self.item_rows.append(row)

    def _remove_item_row(self, row):
        if len(self.item_rows) == 1:
            return
        row.destroy()
        self.item_rows.remove(row)
        self._recalculate_total()

    def _recalculate_total(self):
        total = 0.0
        for row in self.item_rows:
            row.refresh_total_label()
            total += row.row_total()
        self.total_label.configure(text=f"Total: ${total:,.2f}")

    def _collect_form(self):
        return {
            "from_name": self.from_name.get(),
            "from_phone": self.from_phone.get(),
            "from_address": self.from_address.get(),
            "bill_to_name": self.bill_to_name.get(),
            "bill_to_phone": self.bill_to_phone.get(),
            "bill_to_address": self.bill_to_address.get(),
            "invoice_no": self.invoice_no.get(),
            "invoice_date": self.invoice_date.get(),
            "date_due": self.date_due.get(),
            "payment_method": self.payment_method.get(),
            "items": [row.as_dict() for row in self.item_rows],
        }

    def _on_export(self, fmt):
        form = self._collect_form()
        errors = validate(form)
        if errors:
            messagebox.showerror("Corrija os campos abaixo", "\n".join(errors))
            return

        invoice = build_invoice_data(form)
        default_name = suggested_filename(invoice.invoice_no, invoice.bill_to_name, fmt)
        documents_dir = Path.home() / "Documents"
        filetypes = (
            [("Arquivo PDF", "*.pdf")] if fmt == "pdf" else [("Planilha Excel", "*.xlsx")]
        )
        path = filedialog.asksaveasfilename(
            initialfile=default_name,
            defaultextension=f".{fmt}",
            filetypes=filetypes,
            initialdir=str(documents_dir) if documents_dir.exists() else str(Path.home()),
        )
        if not path:
            return

        try:
            if fmt == "pdf":
                generate_pdf(invoice, Path(path))
            else:
                generate_excel(invoice, Path(path))
        except Exception as exc:  # noqa: BLE001 - surface any failure to the user
            messagebox.showerror("Erro ao gerar arquivo", str(exc))
            return

        storage.advance_invoice_number(self.config_path)
        self.invoice_no.set(str(storage.peek_next_invoice_number(self.config_path)))

        try:
            os.startfile(path)
        except OSError:
            pass

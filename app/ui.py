import os
from datetime import date
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk
from PIL import Image

from app import storage
from app.excel_generator import generate_excel
from app.invoice_builder import build_invoice_data, suggested_filename, validate
from app.pdf_generator import generate_pdf
from app.resources import resource_path

DEFAULT_FROM = {
    "name": "SLV Cleaning Services",
    "phone": "508-901-1384",
    "address": "69, Cato lane",
}

# Palette pulled from the SLV Cleaning Services logo, not the CTk default blue theme.
NAVY = "#0F2F5C"
NAVY_HOVER = "#0B2447"
NAVY_SOFT = "#E7ECF3"
BLUE_ACCENT = "#1565A8"
GREEN = "#3F8F29"
GREEN_HOVER = "#336F21"
BACKGROUND = "#F5F6F8"
SURFACE = "#FFFFFF"
BORDER = "#E1E4EA"
TEXT_PRIMARY = "#1C2530"
TEXT_SECONDARY = "#66707C"
DANGER = "#B3413A"
DANGER_HOVER = "#8E3129"

FONT_FAMILY = "Segoe UI"
CARD_RADIUS = 12
FIELD_RADIUS = 8
BUTTON_RADIUS = 8


def _font(size, weight="normal"):
    return ctk.CTkFont(family=FONT_FAMILY, size=size, weight=weight)


class ItemRow:
    def __init__(self, parent, on_change, on_remove):
        self.frame = ctk.CTkFrame(parent, fg_color="transparent")
        self.frame.pack(fill="x", pady=4)

        self.description = ctk.StringVar()
        self.price = ctk.StringVar()
        self.qty = ctk.StringVar()

        desc_entry = ctk.CTkEntry(
            self.frame,
            textvariable=self.description,
            placeholder_text="Descrição do serviço",
            font=_font(13),
            corner_radius=FIELD_RADIUS,
            border_color=BORDER,
            fg_color=SURFACE,
        )
        desc_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))

        price_entry = ctk.CTkEntry(
            self.frame,
            textvariable=self.price,
            placeholder_text="Preço",
            width=90,
            font=_font(13),
            corner_radius=FIELD_RADIUS,
            border_color=BORDER,
            fg_color=SURFACE,
        )
        price_entry.pack(side="left", padx=4)

        qty_entry = ctk.CTkEntry(
            self.frame,
            textvariable=self.qty,
            placeholder_text="Qtd",
            width=70,
            font=_font(13),
            corner_radius=FIELD_RADIUS,
            border_color=BORDER,
            fg_color=SURFACE,
        )
        qty_entry.pack(side="left", padx=4)

        self.total_label = ctk.CTkLabel(
            self.frame,
            text="$0.00",
            width=90,
            anchor="e",
            font=_font(13, "bold"),
            text_color=NAVY,
        )
        self.total_label.pack(side="left", padx=8)

        remove_button = ctk.CTkButton(
            self.frame,
            text="Remover",
            width=72,
            height=28,
            font=_font(11),
            corner_radius=BUTTON_RADIUS,
            fg_color="transparent",
            text_color=DANGER,
            hover_color="#F5E3E1",
            border_width=1,
            border_color=DANGER,
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
        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("blue")
        super().__init__(fg_color=BACKGROUND)

        self.title("SLV Cleaning Services - Emissor de Invoice")
        self.geometry("880x820")
        self.minsize(760, 640)
        self._set_window_icon()

        self.item_rows = []
        self.config_path = storage.default_config_path()

        self._build_layout()
        self._add_item_row()

    def _set_window_icon(self):
        icon_path = resource_path("assets", "icon.ico")
        if icon_path.exists():
            try:
                self.iconbitmap(str(icon_path))
            except Exception:
                pass

    def _build_layout(self):
        self._build_header()

        container = ctk.CTkScrollableFrame(self, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=24, pady=(16, 20))

        top_row = ctk.CTkFrame(container, fg_color="transparent")
        top_row.pack(fill="x")

        bill_to_card = self._card(top_row)
        bill_to_card.pack(side="left", fill="both", expand=True, padx=(0, 10))
        self.bill_to_name, self.bill_to_phone, self.bill_to_address = self._build_party_section(
            bill_to_card, "Bill to", ("", "", "")
        )

        meta_card = self._card(top_row)
        meta_card.pack(side="left", fill="both", expand=True, padx=(10, 0))
        self._build_meta_section(meta_card)

        from_card = self._card(container)
        from_card.pack(fill="x", pady=(16, 0))
        self.from_name, self.from_phone, self.from_address = self._build_party_section(
            from_card,
            "From",
            (DEFAULT_FROM["name"], DEFAULT_FROM["phone"], DEFAULT_FROM["address"]),
        )

        items_card = self._card(container)
        items_card.pack(fill="x", pady=(16, 0))
        self._build_items_section(items_card)

        self._build_footer(container)

    def _card(self, parent):
        return ctk.CTkFrame(
            parent,
            fg_color=SURFACE,
            corner_radius=CARD_RADIUS,
            border_width=1,
            border_color=BORDER,
        )

    def _build_header(self):
        header = ctk.CTkFrame(self, fg_color=NAVY, corner_radius=0, height=76)
        header.pack(fill="x")
        header.pack_propagate(False)

        inner = ctk.CTkFrame(header, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=24)

        logo_path = resource_path("assets", "logo.png")
        if logo_path.exists():
            logo_image = ctk.CTkImage(
                light_image=Image.open(logo_path), size=(46, 46)
            )
            logo_label = ctk.CTkLabel(inner, image=logo_image, text="")
            logo_label.pack(side="left", pady=15)

        text_col = ctk.CTkFrame(inner, fg_color="transparent")
        text_col.pack(side="left", padx=(14, 0), pady=12)
        ctk.CTkLabel(
            text_col,
            text="SLV Cleaning Services",
            font=_font(18, "bold"),
            text_color="#FFFFFF",
            anchor="w",
        ).pack(anchor="w")
        ctk.CTkLabel(
            text_col,
            text="Emissor de invoice",
            font=_font(12),
            text_color="#B7C6DA",
            anchor="w",
        ).pack(anchor="w")

    def _section_title(self, parent, text):
        ctk.CTkLabel(
            parent,
            text=text,
            font=_font(15, "bold"),
            text_color=TEXT_PRIMARY,
            anchor="w",
        ).pack(anchor="w", padx=18, pady=(16, 4))

    def _build_party_section(self, parent, title, defaults):
        self._section_title(parent, title)
        name_var = self._labeled_entry(parent, "Nome", defaults[0])
        phone_var = self._labeled_entry(parent, "Telefone", defaults[1])
        address_var = self._labeled_entry(parent, "Endereço", defaults[2], last=True)
        return name_var, phone_var, address_var

    def _labeled_entry(self, parent, label, default_value, last=False):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=18, pady=(0, 14 if last else 8))
        ctk.CTkLabel(
            row,
            text=label,
            font=_font(12, "bold"),
            text_color=TEXT_SECONDARY,
            width=88,
            anchor="w",
        ).pack(side="left")
        var = ctk.StringVar(value=default_value)
        ctk.CTkEntry(
            row,
            textvariable=var,
            font=_font(13),
            corner_radius=FIELD_RADIUS,
            border_color=BORDER,
            fg_color=SURFACE,
        ).pack(side="left", fill="x", expand=True)
        return var

    def _build_meta_section(self, parent):
        self._section_title(parent, "Dados da invoice")
        next_number = storage.peek_next_invoice_number(self.config_path)
        self.invoice_no = self._labeled_entry(parent, "Nº invoice", str(next_number))
        self.invoice_date = self._labeled_entry(
            parent, "Data", date.today().strftime("%d/%m")
        )
        self.date_due = self._labeled_entry(parent, "Vencimento", "")
        self.payment_method = self._labeled_entry(
            parent, "Pagamento", "Cash", last=True
        )

    def _build_items_section(self, parent):
        self._section_title(parent, "Itens")

        columns = ctk.CTkFrame(parent, fg_color="transparent")
        columns.pack(fill="x", padx=18, pady=(0, 2))
        for text, width in (("Descrição", None), ("Preço", 90), ("Qtd", 70), ("Total", 90)):
            label = ctk.CTkLabel(
                columns,
                text=text,
                font=_font(11, "bold"),
                text_color=TEXT_SECONDARY,
                width=width if width else 0,
                anchor="w" if width is None else "center",
            )
            if width is None:
                label.pack(side="left", fill="x", expand=True, padx=(0, 8))
            else:
                label.pack(side="left", padx=4)

        self.items_container = ctk.CTkFrame(parent, fg_color="transparent")
        self.items_container.pack(fill="x", padx=18)

        ctk.CTkButton(
            parent,
            text="+  Adicionar item",
            command=self._add_item_row,
            font=_font(12, "bold"),
            corner_radius=BUTTON_RADIUS,
            fg_color="transparent",
            text_color=BLUE_ACCENT,
            hover_color=NAVY_SOFT,
            border_width=1,
            border_color=BLUE_ACCENT,
            height=32,
        ).pack(anchor="w", padx=18, pady=(8, 18))

    def _build_footer(self, container):
        total_row = ctk.CTkFrame(container, fg_color="transparent")
        total_row.pack(fill="x", pady=(20, 12))
        self.total_label = ctk.CTkLabel(
            total_row,
            text="Total: $0.00",
            font=_font(22, "bold"),
            text_color=NAVY,
        )
        self.total_label.pack(side="right")

        buttons_frame = ctk.CTkFrame(container, fg_color="transparent")
        buttons_frame.pack(fill="x")
        ctk.CTkButton(
            buttons_frame,
            text="Exportar PDF",
            height=46,
            font=_font(14, "bold"),
            corner_radius=BUTTON_RADIUS,
            fg_color=NAVY,
            hover_color=NAVY_HOVER,
            command=lambda: self._on_export("pdf"),
        ).pack(side="left", fill="x", expand=True, padx=(0, 8))
        ctk.CTkButton(
            buttons_frame,
            text="Exportar Excel",
            height=46,
            font=_font(14, "bold"),
            corner_radius=BUTTON_RADIUS,
            fg_color=GREEN,
            hover_color=GREEN_HOVER,
            command=lambda: self._on_export("xlsx"),
        ).pack(side="left", fill="x", expand=True, padx=(8, 0))

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

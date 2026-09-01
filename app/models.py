from dataclasses import dataclass, field


@dataclass
class LineItem:
    description: str
    price: float
    qty: float

    @property
    def total(self) -> float:
        return self.price * self.qty


@dataclass
class InvoiceData:
    from_name: str
    from_phone: str
    from_address: str
    bill_to_name: str
    bill_to_phone: str
    bill_to_address: str
    invoice_no: str
    invoice_date: str
    date_due: str
    payment_method: str
    items: list = field(default_factory=list)

    @property
    def total(self) -> float:
        return sum(item.total for item in self.items)

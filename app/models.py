from dataclasses import dataclass, field


@dataclass
class LineItem:
    date: str
    client: str
    hours: float

    def amount(self, hourly_rate: float) -> float:
        return self.hours * hourly_rate


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
    hourly_rate: float
    items: list = field(default_factory=list)

    @property
    def total(self) -> float:
        return sum(item.amount(self.hourly_rate) for item in self.items)

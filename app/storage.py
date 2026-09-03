import json
import os
from pathlib import Path


def default_config_path() -> Path:
    appdata = os.environ.get("APPDATA", str(Path.home()))
    return Path(appdata) / "SLVInvoice" / "config.json"


def peek_next_invoice_number(config_path: Path) -> int:
    if not config_path.exists():
        return 1
    data = json.loads(config_path.read_text(encoding="utf-8"))
    return data.get("next_invoice_no", 1)


def set_next_invoice_number(config_path: Path, value: int) -> None:
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({"next_invoice_no": value}), encoding="utf-8")


def advance_invoice_number(config_path: Path) -> None:
    set_next_invoice_number(config_path, peek_next_invoice_number(config_path) + 1)

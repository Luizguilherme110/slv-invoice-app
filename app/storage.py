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


def advance_invoice_number(config_path: Path) -> None:
    current = peek_next_invoice_number(config_path)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(
        json.dumps({"next_invoice_no": current + 1}), encoding="utf-8"
    )

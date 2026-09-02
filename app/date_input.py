def format_date_digits(raw: str) -> str:
    digits = "".join(ch for ch in raw if ch.isdigit())[:4]
    if len(digits) <= 2:
        return digits
    return f"{digits[:2]}/{digits[2:]}"

def format_date_digits(raw: str) -> str:
    digits = "".join(ch for ch in raw if ch.isdigit())[:8]

    day, month, year = digits[:2], digits[2:4], digits[4:8]

    formatted = day
    if month:
        formatted += f"/{month}"
    if year:
        formatted += f"/{year}"
    return formatted

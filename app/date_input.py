def format_range(start: str, end: str) -> str:
    """Renders a two-date period as "start - end", tolerating a missing end."""
    parts = [part.strip() for part in (start, end) if part and part.strip()]
    return " - ".join(parts)


def format_date_digits(raw: str) -> str:
    digits = "".join(ch for ch in raw if ch.isdigit())[:8]

    day, month, year = digits[:2], digits[2:4], digits[4:8]

    formatted = day
    if month:
        formatted += f"/{month}"
    if year:
        formatted += f"/{year}"
    return formatted

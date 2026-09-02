from app.date_input import format_date_digits


def test_empty_stays_empty():
    assert format_date_digits("") == ""


def test_single_digit_has_no_slash_yet():
    assert format_date_digits("0") == "0"


def test_two_digits_has_no_slash_yet():
    assert format_date_digits("01") == "01"


def test_third_digit_inserts_first_slash():
    assert format_date_digits("013") == "01/3"


def test_four_digits_formats_as_dd_mm():
    assert format_date_digits("0104") == "01/04"


def test_fifth_digit_inserts_second_slash():
    assert format_date_digits("01042") == "01/04/2"


def test_eight_digits_formats_as_dd_mm_yyyy():
    assert format_date_digits("01042026") == "01/04/2026"


def test_extra_digits_beyond_eight_are_dropped():
    assert format_date_digits("0104202699") == "01/04/2026"


def test_non_digit_characters_are_stripped():
    assert format_date_digits("ab01cd04ef2026") == "01/04/2026"


def test_already_formatted_input_is_idempotent():
    assert format_date_digits("01/04/2026") == "01/04/2026"

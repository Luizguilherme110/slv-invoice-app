from app.date_input import format_date_digits


def test_empty_stays_empty():
    assert format_date_digits("") == ""


def test_single_digit_has_no_slash_yet():
    assert format_date_digits("0") == "0"


def test_two_digits_has_no_slash_yet():
    assert format_date_digits("01") == "01"


def test_third_digit_inserts_slash():
    assert format_date_digits("013") == "01/3"


def test_four_digits_formats_as_dd_mm():
    assert format_date_digits("0104") == "01/04"


def test_extra_digits_beyond_four_are_dropped():
    assert format_date_digits("010499") == "01/04"


def test_non_digit_characters_are_stripped():
    assert format_date_digits("ab01cd04") == "01/04"


def test_already_formatted_input_is_idempotent():
    assert format_date_digits("01/04") == "01/04"

from app.storage import (
    advance_invoice_number,
    peek_next_invoice_number,
    set_next_invoice_number,
)


def test_peek_returns_1_when_no_config_file_exists(tmp_path):
    config_path = tmp_path / "SLVInvoice" / "config.json"
    assert peek_next_invoice_number(config_path) == 1


def test_advance_increments_the_stored_counter(tmp_path):
    config_path = tmp_path / "SLVInvoice" / "config.json"
    advance_invoice_number(config_path)
    assert peek_next_invoice_number(config_path) == 2


def test_advance_creates_missing_parent_directory(tmp_path):
    config_path = tmp_path / "nested" / "dir" / "config.json"
    advance_invoice_number(config_path)
    assert config_path.exists()


def test_peek_does_not_mutate_the_counter(tmp_path):
    config_path = tmp_path / "SLVInvoice" / "config.json"
    peek_next_invoice_number(config_path)
    peek_next_invoice_number(config_path)
    assert peek_next_invoice_number(config_path) == 1


def test_set_next_stores_the_given_number(tmp_path):
    config_path = tmp_path / "SLVInvoice" / "config.json"
    set_next_invoice_number(config_path, 23)
    assert peek_next_invoice_number(config_path) == 23


def test_set_next_overrides_a_previously_stored_sequence(tmp_path):
    config_path = tmp_path / "SLVInvoice" / "config.json"
    advance_invoice_number(config_path)
    advance_invoice_number(config_path)
    assert peek_next_invoice_number(config_path) == 3

    # user typed 22 by hand on the invoice they just exported
    set_next_invoice_number(config_path, 23)
    assert peek_next_invoice_number(config_path) == 23


def test_set_next_creates_missing_parent_directory(tmp_path):
    config_path = tmp_path / "nested" / "dir" / "config.json"
    set_next_invoice_number(config_path, 5)
    assert config_path.exists()
    assert peek_next_invoice_number(config_path) == 5

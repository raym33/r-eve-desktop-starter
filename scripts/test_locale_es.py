from locale_es import extract_spanish_fields


def test_extracts_realistic_spanish_invoice_fields() -> None:
    text = (
        "Factura FA-2024-0012\n"
        "NIF: B12345678  Cliente NIE X1234567L\n"
        "IBAN ES91 2100 0418 4502 0005 1332\n"
        "Base 1.234,56 EUR  Total 1.493,82 €\n"
        "Fecha 12/03/2024\n"
        "Presentar modelo 303"
    )

    fields = extract_spanish_fields(text)

    assert fields["tax_ids"] == ["B12345678", "X1234567L"]
    assert fields["ibans"] == ["ES91 2100 0418 4502 0005 1332"]
    assert fields["amounts"] == ["1.234,56 EUR", "1.493,82 €"]
    assert fields["dates"] == ["12/03/2024"]
    assert fields["invoice_numbers"] == ["FA-2024-0012"]
    assert [value.lower() for value in fields["fiscal_forms"]] == ["modelo 303"]


def test_empty_string_returns_all_keys_empty() -> None:
    fields = extract_spanish_fields("")

    assert fields == {
        "tax_ids": [],
        "ibans": [],
        "amounts": [],
        "dates": [],
        "invoice_numbers": [],
        "fiscal_forms": [],
    }


def test_duplicate_values_are_deduped_in_first_seen_order() -> None:
    fields = extract_spanish_fields(
        "NIF B12345678 NIF A12345678 NIF B12345678 "
        "Total 1.493,82 € Total 1.493,82 €"
    )

    assert fields["tax_ids"] == ["B12345678", "A12345678"]
    assert fields["amounts"] == ["1.493,82 €"]


def test_non_string_input_is_handled_as_empty() -> None:
    fields = extract_spanish_fields(None)  # type: ignore[arg-type]

    assert all(values == [] for values in fields.values())


def test_handles_es_vat_undotted_negative_and_multi_segment_invoice() -> None:
    text = (
        "Proveedor ESB12345678\n"
        "Importe 1234,56 EUR  Abono -1.000,00 €\n"
        "Factura FV-001234-2024"
    )

    fields = extract_spanish_fields(text)

    assert "ESB12345678" in fields["tax_ids"]
    assert "1234,56 EUR" in fields["amounts"]
    assert "-1.000,00 €" in fields["amounts"]
    assert fields["invoice_numbers"] == ["FV-001234-2024"]

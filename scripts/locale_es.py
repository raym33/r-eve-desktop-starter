"""Spanish locale field extraction adapted from raym33/superagent locale_packs/es_ES.py."""

from __future__ import annotations

import re

# Each entry: field name -> compiled regex.
_PATTERNS = {
    # NIF / CIF / NIE, with the optional "ES" prefix used on intra-community VAT.
    "tax_ids": re.compile(
        r"\b(?:ES)?(?:[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J])\b"
    ),
    "ibans": re.compile(r"\bES\d{2}(?:\s?\d{4}){5}\b"),
    # Spanish amounts: thousands dots optional, decimal comma required, optional sign.
    "amounts": re.compile(r"(?<![\d.,])-?\d+(?:\.\d{3})*,\d{2}\s*(?:EUR|€)(?!\w)"),
    "dates": re.compile(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b"),
    # FA-2024-0012, FV-001234-2024, FE123, ... (full token, any number of segments).
    "invoice_numbers": re.compile(r"\b(?:FV|FE|FR|FA)[-/]?\d{2,}(?:[-/]\d+)*\b"),
    "fiscal_forms": re.compile(r"\b(?:modelo|mod)\s*(?:303|347|111|115|349)\b", re.IGNORECASE),
}


def extract_spanish_fields(text: str) -> dict[str, list[str]]:
    """Extract deterministic Spanish business-document fields from text."""
    source = text if isinstance(text, str) else ""
    fields: dict[str, list[str]] = {}
    for name, pattern in _PATTERNS.items():
        seen: set[str] = set()
        values: list[str] = []
        for match in pattern.finditer(source):
            value = match.group(0).strip()
            if value not in seen:
                seen.add(value)
                values.append(value)
        fields[name] = values
    return fields

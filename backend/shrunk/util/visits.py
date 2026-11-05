"""Shared visit disclosure and spreadsheet serialization policy."""

from typing import Any

from shrunk.client import ShrunkClient
from shrunk.util.stats import get_human_readable_referer_domain


def anonymize_visit(client: ShrunkClient, visit: Any) -> Any:
    """Replace identifying visit fields with the shared analytics projection."""

    visit_anonymized = {
        "link_id": visit["link_id"],
        "alias": visit["alias"],
        "visitor_id": client.links.get_visitor_id(visit["source_ip"]),
        "user_agent": visit.get("user_agent", "Unknown"),
        "referer": get_human_readable_referer_domain(visit.get("referer", "Unknown")),
        "state_code": (visit.get("state_code", "Unknown") if visit.get("country_code") == "US" else "Unknown"),
        "country_code": visit.get("country_code", "Unknown"),
        "time": visit["time"],
    }

    if "mid" in visit:
        visit_anonymized["mid"] = visit["mid"]
    if "uid" in visit:
        visit_anonymized["uid"] = visit["uid"]

    return visit_anonymized


def spreadsheet_cell(value: Any) -> Any:
    """Prefix formula-capable or leading-control text with a literal apostrophe.

    Leading whitespace may hide a formula prefix from spreadsheet importers.
    Ordinary text, numbers and identifiers keep their original values.
    """
    if isinstance(value, str) and value:
        leading = value.lstrip(" ")
        leading_control = bool(leading) and (ord(leading[0]) < 32 or 127 <= ord(leading[0]) <= 159)
        if leading_control or value.lstrip().startswith(("=", "+", "-", "@")):
            return "'" + value
    return value

from typing import Dict, List, Optional, Tuple, cast

import os
import ldap
from flask import current_app

__all__ = ["is_valid_netid", "query_given_name"]


def _validate_netid_chars(netid: str) -> bool:
    return netid.isalnum()


def _query_netid(netid: str) -> Optional[List[Tuple[str, Dict[str, List[bytes]]]]]:
    if not _validate_netid_chars(netid):
        return None

    conn = ldap.initialize(os.getenv("SHRUNK_LDAP_URI"))
    try:
        conn.simple_bind_s(
            os.getenv("SHRUNK_LDAP_BIND_DN"), os.getenv("SHRUNK_LDAP_CRED")
        )
        query = os.getenv("SHRUNK_LDAP_QUERY_STR").format(netid)
        res = conn.search_s(
            os.getenv("SHRUNK_LDAP_BASE_DN"), ldap.SCOPE_ONELEVEL, query
        )
        return cast(List[Tuple[str, Dict[str, List[bytes]]]], res)
    except ldap.INVALID_CREDENTIALS:
        current_app.logger.error("could not bind to LDAP server!")
        return None
    except ldap.SERVER_DOWN:
        current_app.logger.error(f"LDAP server down: could not validate {netid}")
        return None


def is_valid_netid(netid: str) -> bool:
    if bool(int(os.getenv("SHRUNK_DEV_LOGINS", 0))) and netid.startswith("DEV_"):
        return True

    if current_app.client.user_exists(netid):
        current_app.logger.debug(f"netid {netid} validated from DB")
        return True

    res = _query_netid(netid)
    return res is not None and res != []


def query_given_name(netid: str) -> str:
    if netid.startswith("DEV_"):
        return netid

    res = _query_netid(netid)
    if res is None:
        return netid
    try:
        given_name = str(res[0][1]["givenName"][0], "utf8")
        return given_name
    except (IndexError, KeyError, UnicodeDecodeError):
        return netid


def query_position_info(netid: str) -> Dict[str, List[str]]:
    """Query LDAP for position info of a given netid. Return a dictionary of
    attributes.

    Args:
        netid (str): The netid of the user to query position info for.

    Returns:
        Dict[str, List[str]]: A dictionary of attributes.
    """
    intermediate = _query_netid(netid)
    if intermediate is None:
        return {}

    # The attributes that relate to the user's position in the university
    attributes = ["title", "rutgersEduStaffDepartment", "employeeType"]

    result = {}

    for attr in attributes:
        if attr in intermediate[0][1] and intermediate[0][1][attr]:
            result[attr] = [str(x, "utf8") for x in intermediate[0][1][attr]]
    return result

from typing import Optional, List, Tuple, Dict, cast

from flask import current_app
import ldap

__all__ = ["is_valid_netid", "query_given_name"]


def _validate_netid_chars(netid: str) -> bool:
    return netid.isalnum()


def _query_netid(netid: str) -> Optional[List[Tuple[str, Dict[str, List[bytes]]]]]:
    if not _validate_netid_chars(netid):
        return None

    conn = ldap.initialize(current_app.config["LDAP_URI"])
    try:
        conn.simple_bind_s(
            current_app.config["LDAP_BIND_DN"], current_app.config["LDAP_CRED"]
        )
        query = current_app.config["LDAP_QUERY_STR"].format(netid)
        res = conn.search_s(
            current_app.config["LDAP_BASE_DN"], ldap.SCOPE_ONELEVEL, query
        )  # pylint: disable=no-member
        return cast(List[Tuple[str, Dict[str, List[bytes]]]], res)
    except ldap.INVALID_CREDENTIALS:  # pylint: disable=no-member
        current_app.logger.error("could not bind to LDAP server!")
        return None
    except ldap.SERVER_DOWN:  # pylint: disable=no-member
        current_app.logger.error(f"LDAP server down: could not validate {netid}")
        return None


def is_valid_netid(netid: str) -> bool:
    """Return True if the netid is valid, false otherwise."""
    if not current_app.config.get("LDAP_VALIDATE_NETIDS", False):
        return True

    if current_app.config["DEV_LOGINS"] and netid.startswith("DEV_"):
        return True

    if current_app.client.user_exists(netid):
        current_app.logger.debug(f"netid {netid} validated from DB")
        return True

    res = _query_netid(netid)
    return res is not None and res != []


def query_given_name(netid: str) -> str:
    if not current_app.config.get("LDAP_VALIDATE_NETIDS", False):
        return netid

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
    """Query LDAP for position info of a given netid. Return a dictionary of attributes.

    Args:
        netid (str): The netid of the user to query position info for.

    Returns:
        Dict[str, List[str]]: A dictionary containing the position information of the user.
            The keys of the dictionary represent the attribute names, and the values are lists
            of attribute values.
    """
    if not is_valid_netid(netid) or not current_app.config.get(
        "LDAP_VALIDATE_NETIDS", False
    ):
        return {}

    intermediate = _query_netid(netid)
    if intermediate is None:
        return {}

    # The attributes that relate to the user's position in the university
    attributes = ["uid", "title", "rutgersEduStaffDepartment", "employeeType"]

    result = {}

    for attr in attributes:
        if attr in intermediate[0][1] and intermediate[0][1][attr]:
            result[attr] = [str(x, "utf8") for x in intermediate[0][1][attr]]
    return result

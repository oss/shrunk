"""Security regressions; DB-backed cases use the suite's isolated DB fixture."""

import csv
from datetime import datetime, timezone
from io import StringIO
from typing import Any
from unittest.mock import Mock

import pytest
from bson import ObjectId
from flask import Flask, session
from werkzeug.exceptions import Forbidden

from shrunk.client import ShrunkClient
from shrunk.util.visits import spreadsheet_cell
from shrunk.sso import ext
from shrunk.util.decorators import require_login


@pytest.mark.parametrize("scoped", [False, True])
@pytest.mark.parametrize("power_user", [False, True])
@pytest.mark.parametrize("delete_org", [False, True])
def test_guest_removal_revokes_login_and_existing_session(
    app: Flask, db: ShrunkClient, scoped: bool, power_user: bool, delete_org: bool
) -> None:
    org_id = ObjectId()
    guest_role: dict[str, Any] = {"role": "guest", "granted_by": "alice"}
    if scoped:
        guest_role["organization_id"] = org_id
    roles = [guest_role] + ([{"role": "power_user", "granted_by": "admin"}] if power_user else [])
    db.db.users.insert_one({"netid": "former_guest", "roles": roles})
    db.db.organizations.insert_one(
        {
            "_id": org_id,
            "name": "Former Guest",
            "members": [{"netid": "former_guest", "role": "guest"}],
            "deleted": False,
        }
    )
    identity = {"netid": "former_guest", "employeeType": "GUEST", "twoFactorAuth": True}
    with app.test_request_context():
        response = ext.login_callback(identity)
        assert response.status_code == 302
        assert response.location == "/app/"
        assert session["user"] == identity
    if delete_org:
        assert db.orgs.delete(org_id, "alice")
    else:
        assert db.orgs.delete_member(org_id, "former_guest")
    assert db.users.has_role("former_guest", "power_user") == power_user
    with app.test_request_context():
        with pytest.raises(Forbidden):
            ext.login_callback(identity)
        assert "user" not in session
        session["user"] = identity
        session["guest_only"] = True
        endpoint = require_login(lambda netid, client: "allowed")
        with pytest.raises(Forbidden):
            endpoint()
        assert "user" not in session


@pytest.mark.parametrize("role", ["admin", "facstaff", "whitelisted"])
def test_removed_guest_preserves_independent_session_access(app: Flask, db: ShrunkClient, role: str) -> None:
    roles = [{"role": "guest"}, {"role": role}, {"role": "power_user"}]
    db.db.users.insert_one({"netid": "independent_user", "roles": roles})
    with app.test_request_context():
        session["user"] = {"netid": "independent_user"}
        session["guest_only"] = True
        assert require_login(lambda netid, client: "allowed")() == "allowed"
    assert stored_user(db, "independent_user")["roles"] == roles


@pytest.mark.parametrize("employee_type", ["FACULTY", "STAFF"])
@pytest.mark.parametrize("blacklisted", [False, True])
def test_former_guest_uses_current_sso_eligibility(
    app: Flask, db: ShrunkClient, employee_type: str, blacklisted: bool
) -> None:
    org_id = ObjectId()
    roles = [{"role": "guest", "granted_by": "alice"}, {"role": "power_user", "granted_by": "admin"}]
    db.db.users.insert_one({"netid": "promoted_guest", "roles": roles})
    db.db.organizations.insert_one(
        {
            "_id": org_id,
            "name": "Former Organization",
            "members": [{"netid": "promoted_guest", "role": "guest"}],
            "deleted": False,
        }
    )
    identity = {"netid": "promoted_guest", "employeeType": "GUEST", "twoFactorAuth": True}
    with app.test_request_context():
        assert ext.login_callback(identity).status_code == 302
        assert session["guest_only"] is True
    assert db.orgs.delete_member(org_id, "promoted_guest")
    if blacklisted:
        db.db.users.update_one({"netid": "promoted_guest"}, {"$push": {"roles": {"role": "blacklisted"}}})
    with app.test_request_context():
        identity["employeeType"] = employee_type
        if blacklisted:
            with pytest.raises(Forbidden):
                ext.login_callback(identity)
            assert "user" not in session
        else:
            assert ext.login_callback(identity).status_code == 302
            assert session["guest_only"] is False
            assert db.users.get_user_roles("promoted_guest") == ["guest", "power_user"]
            assert require_login(lambda netid, client: "allowed")() == "allowed"


@pytest.mark.parametrize("employee_type", ["GUEST", "FACULTY", "STAFF"])
@pytest.mark.parametrize("scoped", [False, True])
def test_whitelist_revocation_rechecks_session_access(
    app: Flask, db: ShrunkClient, employee_type: str, scoped: bool
) -> None:
    org_id = ObjectId()
    guest_role: dict[str, Any] = {"role": "guest", "granted_by": "alice"}
    if scoped:
        guest_role["organization_id"] = org_id
    db.db.users.insert_one(
        {"netid": "revoked_whitelist", "roles": [guest_role, {"role": "power_user"}, {"role": "whitelisted"}]}
    )
    db.db.organizations.insert_one(
        {
            "_id": org_id,
            "name": "Revocation",
            "members": [{"netid": "revoked_whitelist", "role": "guest"}],
            "deleted": False,
        }
    )
    identity = {"netid": "revoked_whitelist", "employeeType": employee_type, "twoFactorAuth": True}
    with app.test_request_context():
        assert ext.login_callback(identity).status_code == 302
        assert session["guest_only"] is False
        endpoint = require_login(lambda netid, client: "allowed")
        assert endpoint() == "allowed"
        db.db.users.update_one({"netid": "revoked_whitelist"}, {"$pull": {"roles": {"role": "whitelisted"}}})
        assert endpoint() == "allowed"  # Membership still independently permits guest access.
        assert db.orgs.delete_member(org_id, "revoked_whitelist")
        if employee_type == "GUEST":
            with pytest.raises(Forbidden):
                endpoint()
            assert "user" not in session
        else:
            assert endpoint() == "allowed"
        assert db.users.has_role("revoked_whitelist", "power_user")
    with app.test_request_context():
        if employee_type == "GUEST":
            with pytest.raises(Forbidden):
                ext.login_callback(identity)
        else:
            assert ext.login_callback(identity).status_code == 302


@pytest.mark.parametrize("legacy_session", [False, True])
def test_preexisting_sso_session_loses_access_after_scoped_guest_revocation(
    app: Flask, db: ShrunkClient, monkeypatch: pytest.MonkeyPatch, legacy_session: bool
) -> None:
    netid, org_id = "legacy_whitelist", ObjectId()
    db.users.initialize_user(netid, ["whitelisted", "power_user"])
    identity = {"netid": netid, "employeeType": "GUEST", "twoFactorAuth": True}
    with app.test_request_context():
        assert ext.login_callback(identity).status_code == 302
        authenticated_session = dict(session)
    if legacy_session:
        authenticated_session.pop("guest_only")
    db.db.organizations.insert_one({"_id": org_id, "name": "Scoped Guest", "members": [], "deleted": False})
    assert db.orgs.create_member(org_id, netid, "guest")
    db.orgs.grant_guest_access(org_id, netid, "alice")
    create = Mock(return_value=(ObjectId(), "test-alias"))
    monkeypatch.setattr(db.links, "create", create)
    with app.test_client() as browser:
        with browser.session_transaction() as browser_session:
            browser_session.update(authenticated_session)
        assert browser.post("/api/core/link", json={"long_url": "https://example.org"}).status_code == 201
        assert create.call_args.args[4] == {"_id": org_id, "type": "org"}
        create.reset_mock()
        db.db.users.update_one({"netid": netid}, {"$pull": {"roles": {"role": "whitelisted"}}})
        assert db.orgs.delete_member(org_id, netid)
        assert db.users.get_user_roles(netid) == ["power_user"]
        assert browser.post("/api/core/link", json={"long_url": "https://example.org"}).status_code == 403
        create.assert_not_called()
    with app.test_request_context():
        with pytest.raises(Forbidden):
            ext.login_callback(identity)


def test_legacy_guest_keeps_other_membership_access(app: Flask, db: ShrunkClient) -> None:
    first, second = ObjectId(), ObjectId()
    roles = [{"role": "guest", "granted_by": "alice"}]
    db.db.users.insert_one({"netid": "guest_two_orgs", "roles": roles})
    for org_id in (first, second):
        db.db.organizations.insert_one(
            {
                "_id": org_id,
                "name": str(org_id),
                "members": [{"netid": "guest_two_orgs", "role": "guest"}],
                "deleted": False,
            }
        )
    assert db.orgs.delete_member(first, "guest_two_orgs")
    with app.test_request_context():
        assert (
            ext.login_callback({"netid": "guest_two_orgs", "employeeType": "GUEST", "twoFactorAuth": True}).status_code
            == 302
        )
    assert stored_user(db, "guest_two_orgs")["roles"] == roles


def stored_user(db: ShrunkClient, netid: str) -> dict[str, Any]:
    result = db.db.users.find_one({"netid": netid})
    assert result is not None
    return dict(result)


@pytest.fixture(name="tenants")
def fixture_tenants(db: ShrunkClient) -> tuple[ObjectId, ObjectId, ObjectId]:
    first, second, link = ObjectId(), ObjectId(), ObjectId()
    db.db.organizations.insert_many(
        [
            {"_id": first, "name": "First", "members": [{"netid": "alice", "role": "admin"}], "deleted": False},
            {"_id": second, "name": "Second", "members": [{"netid": "bob", "role": "admin"}], "deleted": False},
        ]
    )
    db.db.urls.insert_one({"_id": link, "owner": {"type": "org", "_id": first}, "alias": "safe", "deleted": False})
    db.db.visits.insert_one(
        {
            "link_id": link,
            "alias": "safe",
            "source_ip": "192.0.2.1",
            "user_agent": "Example browser",
            "referer": "https://example.org/private?secret=yes",
            "time": datetime.now(timezone.utc),
            "mid": "campaign",
            "uid": "reader",
            "country_code": "US",
            "state_code": "NJ",
            "extra_private": "not public",
        }
    )
    return first, second, link


def token(monkeypatch: pytest.MonkeyPatch, db: ShrunkClient, owner: dict[str, Any]) -> dict[str, str]:
    monkeypatch.setattr(db.access_tokens, "verify_token", lambda value: "valid")
    monkeypatch.setattr(db.access_tokens, "check_permissions", lambda *args: True)
    monkeypatch.setattr(db.access_tokens, "get_owner", lambda value: owner)
    return {"Authorization": "Bearer test-only"}


@pytest.mark.parametrize("super_token", [False, True])
def test_visit_tenant_boundary(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch, super_token: bool
) -> None:
    first, second, link = tenants
    owner = {"type": "netid", "_id": "admin"} if super_token else {"type": "org", "_id": first}
    headers = token(monkeypatch, db, owner)
    with app.test_client() as browser:
        response = browser.post(f"/api/v1/links/{first}/{link}/visits", headers=headers, json={})
        assert response.status_code == 200
        assert response.json is not None
        visit = response.json["visits"][0]
        assert "source_ip" not in visit
        assert "extra_private" not in visit
        assert visit["visitor_id"]
        assert visit["referer"] == "example.org"
        assert visit["user_agent"] == "Example browser"
        assert visit["mid"] == "campaign"
        reads = Mock(wraps=db.links.get_visits)
        monkeypatch.setattr(db.links, "get_visits", reads)
        headers = token(
            monkeypatch, db, {"type": "netid", "_id": "admin"} if super_token else {"type": "org", "_id": second}
        )
        assert browser.post(f"/api/v1/links/{second}/{link}/visits", headers=headers, json={}).status_code == 403
        reads.assert_not_called()
        if not super_token:
            assert browser.post(f"/api/v1/links/{first}/{link}/visits", headers=headers, json={}).status_code == 403
            reads.assert_not_called()


@pytest.mark.parametrize(
    "body",
    [
        {"mid": {"$ne": None}},
        {"uid": {"$regex": "x"}},
        {"mid": ["ok", {}]},
        {"uid": [["x"]]},
        {"uid": 1},
        {"mid": True},
        [],
        "x",
        {"extra": "x"},
    ],
)
def test_visit_filters_reject_operators_before_db(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch, body: Any
) -> None:
    first, _, link = tenants
    headers = token(monkeypatch, db, {"type": "org", "_id": first})
    reads = Mock(wraps=db.links.get_owner)
    monkeypatch.setattr(db.links, "get_owner", reads)
    with app.test_client() as browser:
        assert browser.post(f"/api/v1/links/{first}/{link}/visits", headers=headers, json=body).status_code == 400
    reads.assert_not_called()


@pytest.mark.parametrize(
    ("body", "count"),
    [
        ({}, 1),
        ({"mid": None, "uid": None}, 1),
        ({"mid": "campaign", "uid": ["reader"]}, 1),
        ({"mid": []}, 0),
        ({"uid": "other"}, 0),
        ({"mid": "$ne"}, 0),
    ],
)
def test_visit_filter_controls(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch, body: dict, count: int
) -> None:
    first, _, link = tenants
    headers = token(monkeypatch, db, {"type": "org", "_id": first})
    with app.test_client() as browser:
        response = browser.post(f"/api/v1/links/{first}/{link}/visits", headers=headers, json=body)
        assert response.status_code == 200
        assert response.json is not None
        assert len(response.json["visits"]) == count


@pytest.mark.parametrize("delete_org", [False, True])
def test_remove_guest_preserves_other_grants(db: ShrunkClient, tenants: tuple, delete_org: bool) -> None:
    first, second, _ = tenants
    roles = [{"role": role, "granted_by": "system"} for role in ("admin", "blacklisted", "guest")]
    roles.append({"role": "guest", "organization_id": second})
    db.db.users.insert_one({"netid": "victim", "roles": roles + [{"role": "guest", "organization_id": first}]})
    db.orgs.create_member(first, "victim", "guest")
    db.orgs.create_member(second, "victim", "guest")
    legacy_grant = {"entity": "victim", "role": "whitelisted"}
    db.db.grants.insert_one(legacy_grant)
    if delete_org:
        assert db.orgs.delete(first, "alice")
    else:
        assert db.orgs.delete_member(first, "victim")
    assert stored_user(db, "victim")["roles"] == roles
    assert db.orgs.is_guest(second, "victim")
    assert not db.orgs.is_member(first, "victim")
    assert db.db.grants.find_one(legacy_grant) is not None


def test_new_guest_grant_provenance(db: ShrunkClient, tenants: tuple) -> None:
    first, second, _ = tenants
    db.users.initialize_user("newguest", [])
    db.orgs.create_member(first, "newguest", "guest")
    db.orgs.grant_guest_access(first, "newguest", "alice")
    assert db.users.has_role("newguest", "guest")
    db.orgs.grant_guest_access(second, "newguest", "bob")
    assert len(stored_user(db, "newguest")["roles"]) == 2
    db.orgs.delete_member(second, "newguest")
    assert db.users.has_role("newguest", "guest")
    db.orgs.delete_member(first, "newguest")
    assert not db.users.has_role("newguest", "guest")


@pytest.mark.parametrize(
    "value",
    [
        "=1+1",
        "+cmd",
        "-1",
        "@SUM(A1)",
        "\ttext",
        "  \ttext",
        "\rtext",
        "\ntext",
        "\x00text",
        "\x7ftext",
        "  =1+1",
        "\u0085text",
    ],
)
def test_spreadsheet_cell_neutralizes_formulas(value: str) -> None:
    assert spreadsheet_cell(value) == "'" + value


@pytest.mark.parametrize("value", ["ordinary", " spaced text", "a=b", "", "https://example.org", 123, None])
def test_spreadsheet_cell_preserves_ordinary_values(value: Any) -> None:
    assert spreadsheet_cell(value) == value


def test_downloaded_csv_all_text_cells(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch
) -> None:
    _, _, link = tenants
    hostile = "\t=1+1"
    visit: dict[str, Any] = {
        key: hostile
        for key in (
            "link_id",
            "alias",
            "visitor_id",
            "mid",
            "uid",
            "user_agent",
            "referer",
            "state_code",
            "country_code",
        )
    }
    visit["time"] = datetime.now(timezone.utc)
    monkeypatch.setattr("shrunk.api.link.anonymize_visit", lambda *args: visit)
    monkeypatch.setattr(db.links, "may_view", lambda *args: True)
    with app.test_client() as browser:
        with browser.session_transaction() as browser_session:
            browser_session["user"] = {"netid": "alice"}
        response = browser.get(f"/api/core/link/{link}/visits")
        assert response.status_code == 200
        rows = list(csv.reader(StringIO(response.text)))
        assert rows[1][:-1] == ["'" + hostile] * 9
        assert rows[1][-1] == visit["time"].isoformat()


def test_org_admin_cannot_erase_global_roles(app: Flask, db: ShrunkClient, tenants: tuple) -> None:
    first, second, _ = tenants
    db.users.initialize_user("victim", ["admin", "blacklisted", "guest"])
    before = stored_user(db, "victim")["roles"]
    db.orgs.create_member(first, "victim", "member")
    db.orgs.create_member(second, "victim", "guest")
    with app.test_client() as browser:
        with browser.session_transaction() as browser_session:
            browser_session["user"] = {"netid": "bob"}
        assert browser.delete(f"/api/core/org/{first}/member/victim").status_code == 403
        assert db.orgs.is_member(first, "victim")
        with browser.session_transaction() as browser_session:
            browser_session["user"] = {"netid": "alice"}
        assert browser.patch(f"/api/core/org/{first}/member/victim", json={"role": "guest"}).status_code == 204
        assert browser.delete(f"/api/core/org/{first}/member/victim").status_code == 204
    assert stored_user(db, "victim")["roles"] == before
    assert db.orgs.is_guest(second, "victim")


def test_guest_route_records_org_grant(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch
) -> None:
    first, _, _ = tenants
    monkeypatch.setattr("shrunk.api.org.is_university_guest", lambda value: True)
    with app.test_client() as browser:
        with browser.session_transaction() as browser_session:
            browser_session["user"] = {"netid": "alice"}
        assert browser.put(f"/api/core/org/{first}/guest/newguest").status_code == 204
        grant = stored_user(db, "newguest")["roles"][0]
        assert grant["organization_id"] == first
        assert grant["granted_by"] == "alice"
        assert browser.delete(f"/api/core/org/{first}/member/newguest").status_code == 204
    assert not db.users.has_role("newguest", "guest")


@pytest.mark.parametrize("payload", ["null", "{", ""])
def test_visit_body_requires_json_object(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch, payload: str
) -> None:
    first, _, link = tenants
    headers = token(monkeypatch, db, {"type": "org", "_id": first})
    reads = Mock(wraps=db.links.get_owner)
    monkeypatch.setattr(db.links, "get_owner", reads)
    with app.test_client() as browser:
        response = browser.post(
            f"/api/v1/links/{first}/{link}/visits", headers=headers, data=payload, content_type="application/json"
        )
        assert response.status_code == 400
    reads.assert_not_called()


def test_org_deletion_revokes_scoped_guest_after_member_role_change(db: ShrunkClient, tenants: tuple) -> None:
    first, _, _ = tenants
    db.users.initialize_user("newguest", [])
    db.orgs.create_member(first, "newguest", "guest")
    db.orgs.grant_guest_access(first, "newguest", "alice")
    db.orgs.set_member_role(first, "newguest", "member")
    assert db.orgs.delete(first, "alice")
    assert not db.users.has_role("newguest", "guest")


def test_downloaded_csv_stored_values(app: Flask, db: ShrunkClient, tenants: tuple) -> None:
    _, _, link = tenants
    db.db.visits.update_one(
        {"link_id": link},
        {
            "$set": {
                "mid": "=1+1",
                "uid": "\r@SUM(A1)",
                "user_agent": "  +cmd",
                "alias": "ordinary",
            }
        },
    )
    with app.test_client() as browser:
        with browser.session_transaction() as browser_session:
            browser_session["user"] = {"netid": "alice"}
        response = browser.get(f"/api/core/link/{link}/visits")
        assert response.status_code == 200
        rows = list(csv.DictReader(StringIO(response.text)))
        assert rows[0]["mid"] == "'=1+1"
        assert rows[0]["uid"] == "'\r@SUM(A1)"
        assert rows[0]["user_agent"] == "'  +cmd"
        assert rows[0]["alias"] == "ordinary"
        assert rows[0]["referer"] == "example.org"


def test_visits_missing_and_personal_links(
    app: Flask, db: ShrunkClient, tenants: tuple, monkeypatch: pytest.MonkeyPatch
) -> None:
    first, _, link = tenants
    headers = token(monkeypatch, db, {"type": "netid", "_id": "admin"})
    reads = Mock(wraps=db.links.get_visits)
    monkeypatch.setattr(db.links, "get_visits", reads)
    with app.test_client() as browser:
        assert browser.post(f"/api/v1/links/{first}/{ObjectId()}/visits", headers=headers, json={}).status_code == 404
        db.db.urls.update_one({"_id": link}, {"$set": {"owner": {"type": "netid", "_id": "alice"}}})
        assert browser.post(f"/api/v1/links/{first}/{link}/visits", headers=headers, json={}).status_code == 403
    reads.assert_not_called()

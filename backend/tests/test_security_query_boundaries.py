"""Isolated boundary tests: no MongoDB connection or reset fixtures."""

import base64
from collections.abc import Iterator
from typing import Any, cast
from html import escape
import re
from unittest.mock import Mock

from bson import ObjectId
from flask import Flask, jsonify
from pymongo.errors import ExecutionTimeout
import pytest
from werkzeug.exceptions import BadRequest, HTTPException, ServiceUnavailable

from shrunk.client.exceptions import BadLongURLException
from shrunk import Base32Converter, ObjectIdConverter
from shrunk.api.link import bp as link_bp
from shrunk.api.search import bp as search_bp
from shrunk.api_errors import ApiProblem, http_error_payload
from shrunk.client.links import LinksClient
from shrunk.client.search import SearchClient
from shrunk.client.orgs import OrgsClient


@pytest.mark.parametrize("failure", [None, "execute", "iterate"])
def test_organization_search_deadline_and_timeout(failure: str | None) -> None:
    db = Mock()
    request = {
        "query": "[literal",
        "sort": {"key": "name", "order": "ascending"},
        "pagination": {"skip": 0, "limit": 10},
    }
    db.organizations.aggregate.return_value = iter([{"count": [], "results": []}])
    if failure == "execute":
        db.organizations.aggregate.side_effect = ExecutionTimeout("private database details")
    elif failure == "iterate":

        def timeout() -> Iterator[dict[str, Any]]:
            yield from ()
            raise ExecutionTimeout("private database details")

        db.organizations.aggregate.return_value = timeout()
    client = OrgsClient(db=db)
    if failure:
        with pytest.raises(ServiceUnavailable, match="Organization search timed out"):
            client.search("alice", request)
    else:
        assert client.search("alice", request) == {"count": 0, "results": []}
    args, kwargs = db.organizations.aggregate.call_args
    assert kwargs["maxTimeMS"] == 1000
    assert args[0][1]["$match"]["name"]["$regex"] == re.escape("[literal")


def links_client() -> tuple[LinksClient, Mock, Mock]:
    db, other = Mock(), Mock()
    client = LinksClient(db=db, geoip=Mock(), RESERVED_WORDS=set(), BANNED_REGEXES=[], other_clients=other)
    return client, db, other


def query() -> dict[str, Any]:
    return {
        "set": [{"set": "user"}],
        "sort": {"key": "created_time", "order": "ascending"},
        "show_type": "links",
    }


@pytest.mark.parametrize("value", ["[", "a.*", "a.b", "(test)", "ordinary", "a\\b", "a" * 256])
def test_alias_is_literal_with_deadline(value: str) -> None:
    client, db, _ = links_client()
    db.urls.find_one.return_value = None
    assert not client.alias_is_duplicate(value, False)
    args, kwargs = db.urls.find_one.call_args
    pattern = args[0]["alias"]["$regex"]
    assert re.fullmatch(pattern, value, re.IGNORECASE)
    assert not re.fullmatch(pattern, "unrelated", re.IGNORECASE)
    assert kwargs["max_time_ms"] == 1000
    db.urls.find_one.return_value = {"alias": value}
    assert client.alias_is_duplicate(value, False)


@pytest.mark.parametrize("value", ["", "a" * 257, None, {"$ne": ""}])
def test_alias_rejects_invalid_values_before_database(value: object) -> None:
    client, db, _ = links_client()
    with pytest.raises(BadRequest):
        client.alias_is_duplicate(cast(str, value), False)
    db.urls.find_one.assert_not_called()


@pytest.mark.parametrize("field", ["title", "alias", "url"])
@pytest.mark.parametrize("value", ["[", "a.*", "ordinary", "a.b", "$title", "a" * 512])
def test_search_literal_and_deadline(field: str, value: str) -> None:
    db = Mock()
    db.urls.aggregate.return_value = iter([{"count": [], "result": []}])
    client = SearchClient(db=db, client=Mock())
    assert client.execute_url("user", {**query(), field: value}) == {
        "count": 0,
        "results": [],
    }
    args, kwargs = db.urls.aggregate.call_args
    search_field = "long_url" if field == "url" else field
    pattern = args[0][1]["$match"]["$and"][0][search_field]["$regex"]
    assert re.search(pattern, value)
    assert not re.search(pattern, "unrelated")
    assert kwargs["maxTimeMS"] == 1000


@pytest.mark.parametrize("field", ["title", "alias", "url", "query", "owner"])
@pytest.mark.parametrize("value", ["a" * 513, {"$regex": "x"}])
def test_search_rejects_invalid_fields_before_database(field: str, value: object) -> None:
    db = Mock()
    with pytest.raises(BadRequest):
        SearchClient(db=db, client=Mock()).execute_url("user", {**query(), field: value})
    db.urls.aggregate.assert_not_called()


def test_query_timeouts_are_controlled_including_cursor_iteration() -> None:
    client, db, _ = links_client()
    db.urls.find_one.side_effect = ExecutionTimeout("internal database detail")
    with pytest.raises(ServiceUnavailable, match="Alias validation timed out"):
        client.alias_is_duplicate("ordinary", False)
    db = Mock()
    search = SearchClient(db=db, client=Mock())
    db.urls.aggregate.side_effect = ExecutionTimeout("internal database detail")
    with pytest.raises(ServiceUnavailable, match="Search timed out"):
        search.execute_url("user", query())
    db.urls.aggregate.side_effect = None

    def expired_cursor() -> Iterator[dict[str, Any]]:
        yield from ()
        raise ExecutionTimeout("internal database detail")

    db.urls.aggregate.return_value = expired_cursor()
    with pytest.raises(ServiceUnavailable, match="Search timed out"):
        search.execute_url("user", query())


def test_shared_org_lookup_has_deadline() -> None:
    db = Mock()
    db.organizations.find.return_value = []
    db.urls.aggregate.return_value = iter([{"count": [], "result": []}])
    SearchClient(db=db, client=Mock()).execute_url("user", {**query(), "set": [{"set": "shared"}]})
    assert db.organizations.find.call_args.kwargs["max_time_ms"] == 1000


def test_access_request_html_escapes_all_substitutions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, _, _ = links_client()
    title = '<img src=x onerror="alert(1)"> & Research'
    owner = 'owner<&"'
    requester = 'requester<&"'
    monkeypatch.setattr(
        client, "get_link_info", Mock(return_value={"owner": {"type": "netid", "_id": owner}, "title": title})
    )
    monkeypatch.setattr("shrunk.client.links.query_given_name", lambda _: "Researcher")
    monkeypatch.setattr(
        "shrunk.client.links.url_for",
        lambda *a, **kw: 'https://example.test/?a=1&b="2"',
    )
    mail = Mock()
    client.request_edit_access(mail, ObjectId(), requester)
    message = mail.send_mail.call_args.kwargs
    for value in (title, owner, requester, 'https://example.test/?a=1&b="2"'):
        assert escape(value) in message["html_message"]
        assert value not in message["html_message"]
    assert title in message["message"]


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://10.0.0.1/",
        "http://169.254.169.254/",
        "https://example.test/redirect",
        "https://example.test/ordinary",
    ],
)
def test_create_and_edit_do_not_fetch_destinations(url: str, monkeypatch: pytest.MonkeyPatch) -> None:
    head = Mock(side_effect=AssertionError("Destination fetch is forbidden"))
    monkeypatch.setattr("requests.head", head)
    client, db, other = links_client()
    blocked = Mock(return_value=False)
    monkeypatch.setattr(client, "long_url_is_blocked", blocked)
    monkeypatch.setattr(client, "assert_valid_acl_entry", Mock())
    monkeypatch.setattr(client, "alias_is_reserved", Mock(return_value=False))
    monkeypatch.setattr(client, "alias_is_duplicate", Mock(return_value=False))
    other.security.security_risk_detected.return_value = False
    db.urls.insert_one.return_value.inserted_id = ObjectId()
    db.urls.update_one.return_value.matched_count = 1
    monkeypatch.setattr(client, "get_link_info", Mock(return_value={"owner": {"type": "netid", "_id": "user"}}))
    with Flask(__name__).app_context():
        client.create(
            "Title",
            url,
            "ordinary",
            None,
            {"type": "netid", "_id": "user"},
            "127.0.0.1",
        )
        client.modify(ObjectId(), long_url=url)
    assert blocked.call_count == 2
    assert other.security.security_risk_detected.call_count == 2
    head.assert_not_called()


@pytest.mark.parametrize("operation", ["create", "modify"])
def test_direct_destination_rejection_is_retained(operation: str, monkeypatch: pytest.MonkeyPatch) -> None:
    client, db, _ = links_client()
    monkeypatch.setattr(client, "long_url_is_blocked", Mock(return_value=True))
    if operation == "create":
        with pytest.raises(BadLongURLException):
            client.create(
                "Title",
                "https://blocked.test",
                "alias",
                None,
                {"type": "netid", "_id": "user"},
                "127.0.0.1",
            )
    else:
        with pytest.raises(BadLongURLException):
            client.modify(ObjectId(), long_url="https://blocked.test")
    db.urls.insert_one.assert_not_called()
    db.urls.update_one.assert_not_called()


def test_http_query_boundaries_without_database() -> None:
    app = Flask(__name__)
    app.secret_key = "isolated-unit-test-session"
    app.url_map.converters.update(b32=Base32Converter, ObjectId=ObjectIdConverter)
    app.register_blueprint(link_bp)
    app.register_blueprint(search_bp)
    links, db, other = links_client()
    other.links = links
    other.search = SearchClient(db=db, client=other)
    other.users.has_role.return_value = False
    setattr(app, "client", other)

    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException) -> tuple:
        return jsonify(http_error_payload(exc.code or 500)), exc.code

    @app.errorhandler(ApiProblem)
    def problem(exc: ApiProblem) -> tuple:
        return jsonify(exc.to_dict()), exc.status_code

    with app.test_client() as http:
        with http.session_transaction() as session:
            session["user"] = {"netid": "ordinary"}
        db.urls.aggregate.side_effect = ExecutionTimeout("private database detail")
        payload = {**query(), "show_deleted_links": False, "show_expired_links": False}
        response = http.post("/api/core/search", json=payload)
        assert response.status_code == 503
        assert b"private database detail" not in response.data
        response = http.post("/api/core/search", json={**payload, "title": "a" * 513})
        assert response.status_code == 400
        db.urls.find_one.side_effect = ExecutionTimeout("private database detail")
        encoded = base64.b32encode(b"ordinary").decode()
        response = http.get(f"/api/core/link/validate_duplicate_alias/{encoded}")
        assert response.status_code == 503
        assert b"private database detail" not in response.data
        db.urls.find_one.side_effect = None
        db.urls.find_one.return_value = None
        response = http.get(f"/api/core/link/validate_duplicate_alias/{encoded}")
        assert response.status_code == 200
        assert response.json == {"valid": True}

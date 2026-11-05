"""Audit controls exercised without a database or network connection."""

from types import SimpleNamespace
from typing import Any
from unittest.mock import Mock, patch

from bson import ObjectId
from flask import Flask
import pytest

from shrunk import Base32Converter, ObjectIdConverter
from shrunk.api.link import bp as link_bp
from shrunk.api.user import bp as user_bp
from shrunk.api_errors import ApiProblem
from shrunk.client.geoip import GeoipClient
from shrunk.client.links import LinksClient


def audit_app() -> tuple[Flask, Any]:
    app = Flask(__name__)
    app.secret_key = "isolated-test-secret"
    app.url_map.converters["ObjectId"] = ObjectIdConverter
    app.url_map.converters["b32"] = Base32Converter
    app.register_blueprint(user_bp)
    app.register_blueprint(link_bp)

    @app.errorhandler(ApiProblem)
    def handle_problem(error: ApiProblem) -> tuple[dict[str, Any], int]:
        return error.to_dict(), error.status_code

    backend = Mock()
    setattr(app, "client", backend)
    return app, backend


def test_info_bootstrap_missing_user_and_revoked_session() -> None:
    app, backend = audit_app()
    with app.test_client() as client:
        assert client.get("/api/core/user/info").json == {"netid": "", "privileges": []}
        backend.users.get_user.assert_not_called()
        with client.session_transaction() as session:
            session["user"] = {"netid": "alice"}
        backend.users.get_user.return_value = None
        response = client.get("/api/core/user/info")
        assert response.status_code == 200
        assert response.json is not None
        assert response.json["netid"] == "alice"
        assert response.json["privileges"] == []
        backend.users.get_user.return_value = {"roles": ["whitelisted"]}
        response = client.get("/api/core/user/info")
        assert response.json is not None
        assert response.json["privileges"] == ["whitelisted"]
        backend.users.get_user.return_value = {"roles": ["whitelisted", "blacklisted"]}
        response = client.get("/api/core/user/info")
        assert response.status_code == 403
        assert "privileges" not in (response.json or {})
        backend.users.initialize_user.assert_not_called()


@pytest.mark.parametrize("role", ["ordinary", "power_user", "admin", "unrelated"])
@pytest.mark.parametrize("alias", ["taken", "reserved", "available"])
def test_alias_authorization_precedes_lookups(role: str, alias: str) -> None:
    app, backend = audit_app()
    link_id = ObjectId()
    backend.users.has_role.side_effect = lambda _netid, requested: requested == role
    backend.links.get_link_info.return_value = {"alias": "original"}
    backend.links.may_edit.return_value = role != "unrelated"
    duplicate = Mock(return_value=alias == "taken")
    reserved = Mock(return_value=alias == "reserved")
    modify = Mock()
    backend.links.alias_is_duplicate = duplicate
    backend.links.alias_is_reserved = reserved
    backend.links.modify = modify
    with app.test_client() as client:
        with client.session_transaction() as session:
            session["user"] = {"netid": "bob" if role == "unrelated" else "alice"}
        response = client.patch(f"/api/core/link/{link_id}", json={"alias": alias})
    if role in {"ordinary", "unrelated"}:
        assert response.status_code == 403
        duplicate.assert_not_called()
        reserved.assert_not_called()
        modify.assert_not_called()
    elif alias == "available":
        assert response.status_code == 204
        assert modify.call_args.kwargs["alias"] == alias
    else:
        assert response.status_code == 400
        modify.assert_not_called()


@pytest.mark.parametrize(("offset", "expected"), [(0, "1000"), (2821109907455 - 46656, "zzzzzzzz")])
def test_secure_alias_source_and_bounds(offset: int, expected: str) -> None:
    client = LinksClient(db=Mock(), geoip=Mock(), RESERVED_WORDS=set(), BANNED_REGEXES=[], other_clients=Mock())
    with (
        patch("secrets.randbelow", return_value=offset) as secure,
        patch.object(client, "alias_is_reserved", return_value=False),
        patch.object(client, "alias_is_duplicate", return_value=False),
    ):
        result = client.create_random_alias()
    secure.assert_called_once_with(2821109907455 - 46656 + 1)
    assert result == expected
    assert 4 <= len(result) <= 8
    assert set(result) <= set("0123456789abcdefghijklmnopqrstuvwxyz")


def test_random_alias_retries_reserved_and_duplicate() -> None:
    client = LinksClient(db=Mock(), geoip=Mock(), RESERVED_WORDS=set(), BANNED_REGEXES=[], other_clients=Mock())
    with (
        patch.object(client, "_generate_unique_key", side_effect=["1000", "1001", "1002"]),
        patch.object(client, "alias_is_reserved", side_effect=[True, False, False]),
        patch.object(client, "alias_is_duplicate", side_effect=[True, False]) as duplicate,
    ):
        assert client.create_random_alias(prefix="team", extension=".gif") == "team-1002.gif"
    assert duplicate.call_args_list[-1].args == ("team-1002.gif", True)


@pytest.mark.parametrize(
    ("address", "campus", "private"),
    [
        ("172.15.255.255", None, False),
        ("172.16.0.0", None, True),
        ("172.31.255.255", "New Brunswick", True),
        ("172.32.0.0", None, False),
        ("172.240.1.1", None, False),
        ("172.27.0.1", "Newark", True),
        ("172.24.255.255", "Camden", True),
        ("172.270.0.1", None, False),
        ("8.8.8.8", None, False),
        ("2001:4860:4860::8888", None, False),
    ],
)
def test_geoip_shortcut_boundaries(address: str, campus: str | None, private: bool) -> None:
    reader = Mock()
    reader.city.return_value = SimpleNamespace(
        city=SimpleNamespace(name="Public City"),
        country=SimpleNamespace(name="Canada", iso_code="CA"),
        subdivisions=SimpleNamespace(most_specific=SimpleNamespace(name="Province", iso_code="XX")),
    )
    with patch("geoip2.database.Reader", return_value=reader):
        client = GeoipClient(GEOLITE_PATH="mock-only")
    location = client.get_geoip_location(address)
    codes = client.get_location_codes(address)
    if private:
        expected = "New Jersey, United States"
        assert location == (f"Rutgers {campus}, {expected}" if campus else expected)
        assert codes == ("NJ", "US")
        reader.city.assert_not_called()
    else:
        assert location == "Public City, Province, Canada"
        assert codes == (None, "CA")
        assert reader.city.call_count == 2


def test_geoip_without_database_keeps_unknown() -> None:
    client = GeoipClient()
    assert client.get_geoip_location("172.31.0.1") == "unknown"
    assert client.get_location_codes("172.31.0.1") == (None, None)

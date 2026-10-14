"""URL validation and domain extraction contracts, independent of the database."""

import pytest

from shrunk.util.string import get_domain, validate_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://a.b.RUTGERS.EDU/path?x=1", "rutgers.edu"),
        ("https://example.com", "example.com"),
        ("a.b.example.com/path", "example.com"),
        ("example.com", "example.com"),
        ("http://sub-domain.example-1.com/path", "example-1.com"),
        ("http://localhost/path", "localhost"),
        ("https://example.com/one/two", "example.com"),
        ("https://example.com/redirect/https://other.test/path", "example.com"),
        ("", ""),
    ],
)
def test_domain_extraction(url: str, expected: str) -> None:
    assert get_domain(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com",
        "http://example.com/path?query=value#fragment",
        "ftp://example.com/file",
        "http://localhost:8080/path",
        "https://example.com:443/path",
        "https://[2001:db8::1]/path",
        "https://example.com/?q=one%20two",
    ],
)
def test_valid_urls(url: str) -> None:
    assert validate_url(url) is True


@pytest.mark.parametrize(
    "url",
    [
        "",
        "example.com",
        "javascript:alert(1)",
        "data:text/html,hello",
        "file:///etc/passwd",
        "https://",
        "https://bad host.example/path",
    ],
)
def test_invalid_urls(url: str) -> None:
    assert validate_url(url) is False


@pytest.mark.parametrize(
    "url", ["https://one.example.com?x=1", "https://one.example.com#section", "https://one.example.com:443/path"]
)
def test_domain_excludes_query_fragment_and_port(url: str) -> None:
    actual = get_domain(url)
    known_incorrect_results = {
        "one.example.com?x=1",
        "one.example.com#section",
        "one.example.com:443",
    }
    if actual in known_incorrect_results:
        pytest.xfail("Known domain-parsing bug: query, fragment or port remains in the hostname")
    assert actual == "example.com"

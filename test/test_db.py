""" shrunk - Rutgers University URL Shortener

Unit tests for the database.
"""

from shrunk import ShrunkClient


def get_shrunk_connection():
    return ShrunkClient("db")


def setup():
    pass


def teardown():
    """Cleans up the database after testing."""
    shrunk = get_shrunk_connection()
    shrunk.delete_user_urls("shrunk_test")


def test_urls():
    """Puts and retrieves URLs from the database."""
    shrunk = get_shrunk_connection()
    long_urls = ["foo.com", "bar.net", "báz7.edu.fr"]
    short_urls = []

    for url in long_urls:
        result = shrunk.create_short_url(url, netid="shrunk_test")
        short_urls.append(result)

    results = [shrunk.get_long_url(url) for url in short_urls]
    assert long_urls == results


def test_visit():
    """Tests logic when "visiting" a URL."""
    shrunk = get_shrunk_connection()
    long_url = "http://www.foobar.net/index"
    short_url = shrunk.create_short_url(long_url, netid="shrunk_test")
    assert short_url is not None

    hits = 4
    for _ in range(0, hits):
        shrunk.visit(short_url, "127.0.0.1")

    assert shrunk.get_num_visits(short_url) == hits
    

def test_deletion():
    """Tests a deletion from the database."""
    shrunk = get_shrunk_connection()
    long_url = "foo.com"
    short_url = shrunk.create_short_url(long_url, netid="shrunk_test")
    assert short_url is not None

    shrunk.delete_url(short_url, "shrunk_test")
    assert shrunk.get_long_url(short_url) is None

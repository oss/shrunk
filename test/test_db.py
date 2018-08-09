""" shrunk - Rutgers University URL Shortener

Unit tests for the database.
"""

from shrunk import ShrunkClient
from mongobox import MongoBox

box=MongoBox()
client=ShrunkClient(test_client=box.client())
mongoclient=box.client()
        
def teardown_function():
    mongoclient.drop_database("shrunk_urls")
    mongoclient.drop_database("shrunk_visits")
    mongoclient.drop_database("shrunk_users")

def setup_module():
    box.start()


def teardown_module():
    box.stop()

def insert_urls(long_urls, netid):
    return [client.create_short_url(url, netid=netid) for url in long_urls]

def test_urls():
    """Puts and retrieves URLs from the database."""
    long_urls = ["foo.com", "bar.net", "báz7.edu.fr"]
    short_urls = insert_urls(long_urls, "shrunk_test")
    results = [client.get_long_url(url) for url in short_urls]
    assert long_urls == results

def test_visit():
    """Tests logic when "visiting" a URL."""
    long_url = "http://www.foobar.net/index"
    short_url = client.create_short_url(long_url, netid="shrunk_test")
    assert short_url is not None
    
    hits = 4
    for _ in range(0, hits):
        client.visit(short_url, "127.0.0.1")
        
    assert client.get_num_visits(short_url) == hits

def test_deletion():
    """Tests a deletion from the database."""
    long_url = "foo.com"
    short_url = client.create_short_url(long_url, netid="shrunk_test")
    assert short_url is not None
    
    client.delete_url(short_url, "shrunk_test")
    assert client.get_long_url(short_url) is None


def test_count():
    "Test to see if links are counted correctly"

    alice_urls = insert_urls(["aa.com", "bb.com"], "alice")
    bob_urls = insert_urls(["cc.com", "dd.com", "ee.com"], "bob")

    assert client.count_links(netid="alice") == 2
    assert client.count_links(netid="bob") == 3
    assert client.count_links() == 5

def test_isolated():
    """Sanity check to make sure the db is reset between tests"""
    assert client.count_links() == 0

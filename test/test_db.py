""" shrunk - Rutgers University URL Shortener

Unit tests for the database.
"""

from shrunk import ShrunkClient
import shrunk
from mongobox import MongoBox
from pytest import raises

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
    return [client.create_short_url(url, netid = netid) for url in long_urls]

def get_url(url):
    return client._mongo.shrunk_urls.urls.find_one({"_id": url})

#TODO add more testing in the case of blocked urls, already take ones, reserved words, banned user
#TODO test custom short_urls
#TODO test for can't have shorturl if not admin or power user
def test_urls():
    """Puts and retrieves URLs from the database."""
    long_urls = ["foo.com", "bar.net", "báz7.edu.fr"]
    short_urls = insert_urls(long_urls, "shrunk_test")
    results = [client.get_long_url(url) for url in short_urls]
    assert long_urls == results

def test_visit():
    """Tests logic when "visiting" a URL."""
    long_url = "http://www.foobar.net/index"
    short_url = client.create_short_url(long_url, netid = "shrunk_test")
    assert short_url is not None
    
    hits = 4
    for _ in range(0, hits):
        client.visit(short_url, "127.0.0.1")
        
    assert client.get_num_visits(short_url) is hits

def test_count():
    "Test to see if links are counted correctly"

    alice_urls = insert_urls(["aa.com", "bb.com"], "alice")
    bob_urls = insert_urls(["cc.com", "dd.com", "ee.com"], "bob")

    assert client.count_links(netid="alice") is 2
    assert client.count_links(netid="bob") is 3
    assert client.count_links() is 5

def test_isolated():
    """Sanity check to make sure the db is reset between tests"""
    assert client.count_links() is 0

def test_blocking():
    """make sure block_link and is_blocked work"""
    long_urls = ["https://microsoft.com", 
                 "http://microsoft.com", #should block other protocols
                 "https://microsoft.com/should-block-paths.aspx",
                 "https://should-block-subdomains.microsoft.com",
                 "https://ComL3te-MeSs.mIcroSoft.cOm/of-AllofTh3m/4.aspx"]

    # make sure they start as unblocked
    urls = insert_urls(long_urls,"bgates")
    for long_url in long_urls:
        assert client.is_blocked(long_url) is False
    
    # blocking first time should succeed
    assert client.block_link("https://microsoft.com", blocked_by = "ltorvalds") is not None

    #links the urls we gave should be blocked
    for long_url in long_urls:
        assert client.is_blocked(long_url) is True
    
    # the urls also should no longer be in the database after being blocked
    urls_after_block = [client._mongo.shrunk_urls.blocked_urls.find_one(url) for url in urls]
    for url_after_block in urls_after_block:
        assert url_after_block is None

    # blocking the link twice should be none to show the block is unsuccesful
    assert client.block_link("microsoft.com", blocked_by = "ltorvalds") is None
    
def test_get_domain():
    """testing to get the domain from a url"""
    assert client.get_domain("test.com") == "test.com"
    assert client.get_domain("https://test.com") == "test.com"
    assert client.get_domain("https://test.com/test.php") == "test.com"
    assert client.get_domain("https://sub.test.com/test.php") == "test.com"
    assert client.get_domain("http://sub-sub.anotha.one.TeSt.cOm/test.php") == "test.com"
    assert client.get_domain("http://sfe9fwlmfwe-f9w0f.fw9e0-i.fJe-FJwef-09.org/shady.cgi") == "fje-fjwef-09.org"

def test_modify():
    """make sure modifing the url sets the new info properly"""
    client.block_link("microsoft.com", "ltorvalds")
    url = client.create_short_url("https://linux.org", netid = "dude", title = "title")
    custom_url = client.create_short_url("https://linux.org/custom", 
                                         netid = "dude", short_url = "custom-link")
    def modify(**newargs):
        args={
            "old_short_url": url, 
            "long_url": "https://linux.org"
        }
        args.update(newargs)
        return client.modify_url(**args)

    def modify_admin(**newargs):
        args={"admin": True}
        args.update(newargs)
        return modify(**args)

    #can't edit to blocked urls
    with raises(shrunk.client.ForbiddenDomainException):
        modify(long_url = "https://microsoft.com")

    with raises(shrunk.client.ForbiddenDomainException):
        modify(long_url = "https://ComL3te-MeSs.mIcroSoft.cOm/of-AllofTh3m/4.aspx")

    #can't edit to a reserved word
    with raises(shrunk.client.ForbiddenNameException):
        modify_admin(short_url = "logout")

    #can't edit to an already taken short url
    with raises(shrunk.client.DuplicateIdException):
        modify_admin(short_url = "custom-link")
    
    #can't have custom url if not admin or power user
    modify_admin(short_url = "new-custom")
    new_custom1 = get_url("new-custom")
    assert new_custom1["long_url"] == "https://linux.org"

    modify(power_user = True, short_url = url, old_short_url = "new-custom")
    new_custom2 = get_url(url)
    assert new_custom2["long_url"] == "https://linux.org"

    modify(short_url = "fail")
    new_custom3 = get_url("fail")
    assert new_custom3 is None
    

    #all new information should be set
    
    modify(title = "new-title", long_url = "https://linux.org/other-page.html")
    new_url = get_url(url)
    assert new_url["title"] == "new-title"
    assert new_url["long_url"] == "https://linux.org/other-page.html"

def test_is_owner_or_admin():
    """test utility function to see if somone can modify a url"""
    
    url = client.create_short_url("https://linux.org", netid = "dude")
    client._mongo.shrunk_users.administrators.insert({"netid": "dnolen", "added_by": "rhickey"})
    
    assert client.is_owner_or_admin(url, "dude") is True
    assert client.is_owner_or_admin(url, "dnolen") is True
    assert client.is_owner_or_admin(url, "bgates") is False
    
    #nonexistent url
    assert client.is_owner_or_admin("hogwash", "dnolen") is True
    assert client.is_owner_or_admin("hogwash", "dude") is False

def test_delete_and_visit():
    """test utility function to see if somone can modify a url"""
    
    url = client.create_short_url("https://linux.org", netid = "dude")
    url2 = client.create_short_url("https://linux.org/other", netid = "dude")
    client._mongo.shrunk_users.administrators.insert({"netid": "dnolen", "added_by": "rhickey"})
    client._mongo.shrunk_users.power_users.insert({"netid": "power_user", "added_by": "Justice League"})

    num_visits = 3
    num_visits2 = 4
    
    for _ in range(num_visits):
        client.visit(url, "127.0.0.1")

    for _ in range(num_visits2):
        client.visit(url2, "127.0.0.1")

    
    #confirm visit works
    visits = list(client._mongo.shrunk_visits.visits.find({"short_url": url}))
    assert len(list(client.get_visits(url))) is num_visits
    assert get_url(url)["visits"] is num_visits
    assert len(visits) is num_visits

    visits2 = list(client._mongo.shrunk_visits.visits.find({"short_url": url2}))
    assert len(list(client.get_visits(url2))) is num_visits2
    assert get_url(url2)["visits"] is num_visits2
    assert len(visits2) is num_visits2

    #only owner or admin can delete not power_user or user
    #user
    deletion1 = client.delete_url(url, "user")
    assert deletion1["urlDataResponse"]["nRemoved"] is 0
    assert deletion1["visitDataResponse"]["nRemoved"] is 0
    assert get_url(url)["visits"] is num_visits
    #power
    deletion2 = client.delete_url(url, "power_user")
    assert deletion2["urlDataResponse"]["nRemoved"] is 0
    assert deletion2["visitDataResponse"]["nRemoved"] is 0
    assert get_url(url)["visits"] is num_visits

    #cant delete nonexistant link
    deletion3 = client.delete_url("reasons-to-use-windows", "dnolen")
    assert deletion3["urlDataResponse"]["nRemoved"] is 0
    assert deletion3["visitDataResponse"]["nRemoved"] is 0
    
    #admin
    list(client.get_visits(url2))
    deletion4 = client.delete_url(url, "dnolen")
    assert deletion4["urlDataResponse"]["nRemoved"] is 1
    assert deletion4["visitDataResponse"]["nRemoved"] is num_visits

    #deleting a url will remove it from urls
    assert get_url(url) is None

    #deleting a url should remove its visits
    visits3 = list(client._mongo.shrunk_visits.visits.find({"short_url": url}))
    assert len(list(client.get_visits(url))) is 0
    assert get_url(url) is None
    assert len(visits3) is 0
    
    #deleting one url shouldn't affect the visits of another
    visits4 = list(client._mongo.shrunk_visits.visits.find({"short_url": url2}))
    assert len(list(client.get_visits(url2))) is num_visits2
    assert get_url(url2)["visits"] is num_visits2
    assert len(visits4) is num_visits2

    #owner can delete their own link
    deletion5 = client.delete_url(url2, "dude")
    assert deletion5["urlDataResponse"]["nRemoved"] is 1
    assert deletion5["visitDataResponse"]["nRemoved"] is num_visits2
    assert get_url(url2) is None

    visits5 = list(client._mongo.shrunk_visits.visits.find({"short_url": url2}))
    assert len(list(client.get_visits(url2))) is 0
    assert get_url(url2) is None
    assert len(visits5) is 0

def test_delete_user_urls():
    other_url = client.create_short_url("https://linux.org", netid = "dude")
    long_urls = ["https://microsoft.com", 
                 "http://microsoft.com", 
                 "https://microsoft.com/page.aspx"]
    short_urls = insert_urls(long_urls, "bgates")
    client.delete_user_urls("bgates")
    
    #should remove all of a user's urls
    for url in short_urls:
        assert get_url(url) is None

    #should not remove other users urls
    assert get_url(other_url) is not None

def test_get_url_info():
    url = client.create_short_url("https://linux.org", netid = "dude", title = "my link")

    #returns info with keys
    url_info = client.get_url_info(url)
    assert url_info["timeCreated"] is not None
    assert url_info["title"] is not None
    assert url_info["long_url"] is not None
    assert url_info["netid"] is not None
    assert url_info["visits"] is not None
    assert url_info["_id"] is not None

    #nonexistant is none
    url_info2 = client.get_url_info("hogwash")
    assert url_info2 is None
    
    
    

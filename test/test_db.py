""" shrunk - Rutgers University URL Shortener

Unit tests for the database.
"""

from shrunk import ShrunkClient
import shrunk
from pytest import raises
from datetime import datetime

client=ShrunkClient(host="unit_db")
mongoclient=client._mongo

def teardown_function():
    mongoclient.drop_database("shrunk_urls")
    mongoclient.drop_database("shrunk_visits")
    mongoclient.drop_database("shrunk_users")

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

def make_urls(num_visits, num_visits2):
    url = client.create_short_url("https://linux.org", netid = "dude")
    url2 = client.create_short_url("https://linux.org/other", netid = "dude")
    for _ in range(num_visits):
        client.visit(url, "127.0.0.1")

    for _ in range(num_visits2):
        client.visit(url2, "127.0.0.1")
    return url, url2

def test_visit():
    num_visits = 3
    num_visits2 = 4
    url, url2 = make_urls(num_visits, num_visits2)

    visits = list(client._mongo.shrunk_visits.visits.find({"short_url": url}))
    assert get_url(url)["visits"] is num_visits
    assert len(visits) is num_visits

    visits2 = list(client._mongo.shrunk_visits.visits.find({"short_url": url2}))
    assert get_url(url2)["visits"] is num_visits2
    assert len(visits2) is num_visits2

def test_delete_and_visit():
    """test utility function to see if somone can modify a url"""
    client._mongo.shrunk_users.administrators.insert({"netid": "dnolen", "added_by": "rhickey"})
    client._mongo.shrunk_users.power_users.insert({"netid": "power_user", "added_by": "Justice League"})
    num_visits = 3
    num_visits2 = 4
    url, url2 = make_urls(num_visits, num_visits2)

    def assert_delete(deletion, url, visit):
        assert deletion["urlDataResponse"]["nRemoved"] is url
        assert deletion["visitDataResponse"]["nRemoved"] is visit
    assert_no_delete = lambda delete: assert_delete(delete, 0, 0)

    #only owner or admin can delete not power_user or user
    #user
    assert_no_delete(client.delete_url(url, "user"))
    assert get_url(url)["visits"] is num_visits

    #power
    assert_no_delete(client.delete_url(url, "power_user"))
    assert get_url(url)["visits"] is num_visits

    #cant delete nonexistant link
    assert_no_delete(client.delete_url("reasons-to-use-windows", "dnolen"))
    
    #admin
    assert_delete(client.delete_url(url, "dnolen"), url = 1, visit = num_visits)

    #deleting a url will remove it from urls
    assert get_url(url) is None

    #deleting a url should remove its visits
    visits3 = list(client._mongo.shrunk_visits.visits.find({"short_url": url}))
    assert get_url(url) is None
    assert len(visits3) is 0
    
    #deleting one url shouldn't affect the visits of another
    visits4 = list(client._mongo.shrunk_visits.visits.find({"short_url": url2}))
    assert get_url(url2)["visits"] is num_visits2
    assert len(visits4) is num_visits2

    #owner can delete their own link
    assert_delete(client.delete_url(url2, "dude"), url = 1, visit = num_visits2)
    assert get_url(url2) is None

    visits5 = list(client._mongo.shrunk_visits.visits.find({"short_url": url2}))
    assert get_url(url2) is None
    assert len(visits5) is 0

def test_delete_user_urls():
    other_url = client.create_short_url("https://linux.org", netid = "dude")
    long_urls = ["https://microsoft.com", 
                 "http://microsoft.com", 
                 "https://microsoft.com/page.aspx"]
    short_urls = insert_urls(long_urls, "bgates")
    deletion = client.delete_user_urls("bgates")
    print(deletion)
    assert deletion["n"] is len(long_urls)
    assert deletion["ok"]
    
    #should remove all of a user's urls
    for url in short_urls:
        assert get_url(url) is None

    #should not remove other users urls
    assert get_url(other_url) is not None

    #not giving a netid shouldn't delete anything
    deletion2 = client.delete_user_urls(None)
    assert deletion2["n"] is 0
    assert not deletion2["ok"] 

    #deleting form a user with no urls shouldn't delete anything
    deletion2 = client.delete_user_urls("bgates")
    assert deletion2["n"] is 0
    assert deletion2["ok"]

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


def test_get_long_url():
    url = client.create_short_url("https://linux.org", netid = "dude")
    
    #gives long url
    assert client.get_long_url(url) == "https://linux.org"

    #nonexistent is none
    assert client.get_long_url("hogwash") is None

def test_get_visits():
    num_visits = 3
    num_visits2 = 4
    url, url2 = make_urls(num_visits, num_visits2)
    url3 = client.create_short_url("https://linux.org/third", netid = "dude")
    
    expected_visits = set([visit["_id"] for visit 
                           in client._mongo.shrunk_visits.visits.find({"short_url": url})])
    expected_visits2 = set([visit["_id"] for visit
                            in client._mongo.shrunk_visits.visits.find({"short_url": url2})])
    
    actual_visits = set([visit["_id"] for visit in client.get_visits(url)])
    actual_visits2 = set([visit["_id"] for visit in client.get_visits(url2)])
    
    assert expected_visits == actual_visits
    assert expected_visits2 == actual_visits2
    
    print(dir(client.get_visits(url3)))
    assert client.get_visits(url3).count() is 0
    
    #nonexistent should be None
    assert client.get_visits("hogwash").count() is 0
    
    
def test_get_num_visits():
    num_visits = 3
    num_visits2 = 4
    url, url2 = make_urls(num_visits, num_visits2)

    url3 = client.create_short_url("https://linux.org/third", netid = "dude")
    
    assert client.get_num_visits(url) is num_visits
    assert client.get_num_visits(url2) is num_visits2

    #if the url exists but no one has visited it should give 0
    assert client.get_num_visits(url3) is 0
    
    #nonexistent should be None
    assert client.get_num_visits("hogwash") is None

def test_get_all_urls():
    long_urls = ["https://microsoft.com", 
                 "http://microsoft.com", 
                 "https://microsoft.com/page.aspx"]
    short_urls = insert_urls(long_urls, "bgates")
    all_urls = [url["long_url"] for url in client.get_all_urls()]

    for url in long_urls:
        assert url in all_urls
        
def assert_visit(visit, all_visits, first_time, month=None, year=None):
    """util for testing monthly aggregation"""
    assert visit["all_visits"] is all_visits
    assert visit["first_time_visits"] is first_time
    if month:
        assert visit["_id"]["month"] is month
    if year: 
        assert visit["_id"]["year"] == year

def test_get_monthly_visits():
    num_visits = 3
    num_visits2 = 4
    url, url2 = make_urls(num_visits, num_visits2)

    url3 = client.create_short_url("https://linux.org/third", netid = "dude")
    url5 = client.create_short_url("https://linux.org/fifth", netid = "dude")
    
    visits = client.get_monthly_visits(url)
    visits2 = client.get_monthly_visits(url2)
    #exists but no visits
    visits3 = client.get_monthly_visits(url3)
    #does not exist
    visits4 = client.get_monthly_visits("hogwash")

    assert len(visits) is 1 # only one months worth of visits
    assert len(visits2) is 1
    assert len(visits3) is 0 # no months
    assert len(visits4) is 0
    
    assert_visit(visits[0], num_visits, first_time = 1)
    assert_visit(visits2[0], num_visits2, first_time = 1)

def test_monthly_visits_hard():
    url5 = client.create_short_url("https://linux.org/fifth", netid = "dude")
    def visit(year, month, day, source_ip="127.0.0.1"):
        return {
            "short_url" : url5,
            "source_ip" : source_ip,
            "time" : datetime(year=year, month=month, day=day)
        }
        
    client._mongo.shrunk_visits.visits.insert_many([
        visit(2018,3,3), #same month different year should be different
        visit(2018,3,3),
        visit(2018,3,3, source_ip="127.0.0.2"),
        visit(2018,4,4),
        visit(2015,3,3)
    ])
    visits5 = client.get_monthly_visits(url5)

    assert_visit(visits5[0], 1, first_time = 1, month = 3, year = 2015)
    assert_visit(visits5[1], 3, first_time = 1, month = 3, year = 2018)
    assert_visit(visits5[2], 1, first_time = 0, month = 4, year = 2018)

def test_get_urls():
    #calling list on get_urls or iterating over it will consume it and
    #you won't be able to list() it or iterate on it again
    #<rolls eyes>
    long_urls = ["https://microsoft.com", 
                 "http://microsoft.com", 
                 "https://microsoft.com/page.aspx"]
    uname="bgates"
    short_urls = insert_urls(long_urls, uname)
     
    user_urls = client.get_urls(uname)
    user_short_urls = {url["_id"] for url in user_urls}
    
    for user_url in user_urls:
        assert user_url["netid"] is uname

    for url in short_urls:
        assert url in user_short_urls

def test_search():
    def shortURL(url, title):
        return client.create_short_url(url, netid = "shrunk_test", title=title)
    url = shortURL("https://linux.org", "one") 
    url2 = shortURL("https://thing.org", "other") 
    url3 = shortURL("https://thing.com", "another") 
    
    def assert_title(title, search_result):
        assert title in {link["title"] for link in search_result}

    def assert_id(_id, search_result):
        assert _id in {link["_id"] for link in client.search("LiNuX")}

    #match url or title
    assert_id(url, client.search("linux"))
    assert_title("one", client.search("one"))

    #case insensitive
    assert_title("one", client.search("oNe"))
    assert_title("one", client.search("ONE"))
    assert_id(url, client.search("LiNuX"))
    assert_id(url, client.search("LINUX"))

    #mutliple in a result
    result = {link["_id"] for link in client.search("org")}
    assert url in result
    assert url2 in result

    #mutliple in title
    result2 = {link["title"] for link in client.search("otHer")}
    assert "other" in result2
    assert "another" in result2

    #search by netid
    result3 = {link["_id"] for link in client.search("shrunk_test")}
    assert url in result3
    assert url2 in result3
    assert url3 in result3

def test_search_netid():
    url = client.create_short_url("https://test.com", netid = "Billie Jean", title = "title")
    url2 = client.create_short_url("https://test.com", netid = "Knott MyLova", title = "title")

    def assert_len(length, keyword, netid=None):
        assert len(list(client.search(keyword, netid))) is length

    def assert_search(keyword, netid, url):
        assert list(client.search(keyword, netid))[0]["_id"] == url

    #searches with netid should screen search results withought that netid
    assert_len(1, "test", "Billie Jean")
    assert_len(1, "test", "Knott MyLova")

    assert_len(1, "title", "Billie Jean")
    assert_len(1, "title", "Knott MyLova")

    #searches without netid should have both
    assert_len(2, "test")
    assert_len(2, "title")
    
    #users should get their own links
    assert_search("test", "Billie Jean", url)
    assert_search("title", "Billie Jean", url)

    assert_search("test", "Knott MyLova", url2)
    assert_search("title", "Knott MyLova", url2)



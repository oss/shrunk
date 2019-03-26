from functools import partial
import datetime
from urllib.parse import quote

from shrunk.appserver import app
import shrunk.roles as roles
from views import *

app.switch_db("unit_db")
sclient = app.get_shrunk()
mclient = sclient._mongo


def teardown_function():
    mclient.drop_database("shrunk_urls")
    mclient.drop_database("shrunk_visits")
    mclient.drop_database("shrunk_users")
    mclient.drop_database("shrunk_roles")
    logout()

def in_post_resp(endpoint, string, data):
    response = post(endpoint, data=data)
    assert string in str(response.get_data())

@loginw("user")
def test_add_link():
    # invalid urls
    for url in ["ay", "", "longerrrrrr"]:
        print(url)
        in_post_resp("/add", "Please enter a valid URL.", {
            "long_url": url, "title": "lmao"
        })

    # invalid title
    in_post_resp("/add", "Please enter a title.", {"long_url": "google.com"})

    # cant be blocked
    roles.grant("blocked_url", "anti-foo-man", "https://foo.com")
    in_post_resp("/add", "That URL is not allowed.", {
        "long_url": "https://lmao.foo.com/sus.php",
        "title": "lmao"
    })

    # proper insert
    response = post("/add", data={
        "long_url": "google.com", "title": "lmao"
    })
    assert_redirect(response, "/")
    # make sure link shows up on page
    response = get("/")
    text = str(response.get_data())
    assert "lmao" in text
    assert "google.com" in text

    # shorturl doesnt work
    response = post("/add", data={
        "long_url":"nope.com",
        "title":"nope",
        "short_url": "custom-thing"
    })
    assert response.status_code != 302
    assert response.status_code < 500

    # not on index
    response = get("/")
    text = str(response.get_data())
    assert "nope" not in text

@loginw("power")
def test_add_link_power():
    # test reserved link
    in_post_resp("/add", "That name is reserved", {
        "long_url":"google.com",
        "title":"lmao",
        "short_url": "admin"
    })

    # shorturl works
    response = post("/add", data={
        "long_url":"google.com",
        "title":"lmao",
        "short_url": "customthing"
    })
    assert response.status_code == 302
    # make sure link shows up on page
    response = get("/")
    text = str(response.get_data())
    assert "lmao" in text
    assert "google.com" in text
    assert "customthing" in text

def test_delete():
    mclient.shrunk_urls.urls.insert_many([
        {"_id": "1", "title": "lmao1",
         "long_url": "https://google.com", "netid": "DEV_USER"},
        {"_id": "2", "title": "lmao2",
         "long_url": "https://google.com", "netid": "dude"}
    ])
    login("user")

    # confirm normal delete
    assert_redirect(post("/delete", data={"short_url": "1"}), "/")
    response = get("/")
    text = str(response.get_data())
    assert "lmao1" not in text

    # confirm user cant delete another users link
    # TODO show a message to user telling them they cant delete that link?
    post("/delete", data={"short_url": "2"})
    url = mclient.shrunk_urls.urls.find_one({"_id": "2"})
    assert url is not None

    # confirm power user cant delete another users link
    logout()
    login("power")
    post("/delete", data={"short_url": "2"})
    url = mclient.shrunk_urls.urls.find_one({"_id": "2"})
    assert url is not None

    #confirm admin can delete
    logout()
    login("admin")
    post("/delete", data={"short_url": "2"})
    url = mclient.shrunk_urls.urls.find_one({"_id": "2"})
    assert url is None

@loginw("user")
def test_edit_link():
    mclient.shrunk_urls.urls.insert({
        "_id": "1", "title": "lmao1",
        "long_url": "https://google.com",
        "timeCreated": datetime.datetime.now(),
        "netid": "DEV_USER"
    })

    # invalid urls
    for url in ["ay", "", "longerrrrrr"]:
        print(url)
        in_post_resp("/edit", "Please enter a valid URL.", {
            "long_url": url, "title": "lmao1", "old_short_url": "1"
        })

    # invalid title
    in_post_resp("/edit", "Please enter a title.", {
        "title": "", "long_url": "google.com",
        "old_short_url": "1"
    })

    # cant be blocked
    roles.grant("blocked_url", "anti-foo-man", "https://foo.com")
    in_post_resp("/edit", "That URL is not allowed.", {
        "long_url": "https://lmao.foo.com/sus.php",
        "title": "lmao",
        "old_short_url": "1"
    })

    # proper insert
    response = post("/edit", data={
        "long_url": "facebook.com", "title": "new-lmao",
        "old_short_url": "1"
    })
    assert_redirect(response, "/")
    # make sure link shows up on page
    response = get("/")
    text = str(response.get_data())
    assert "new-lmao" in text
    assert "facebook.com" in text

    # shorturl doesnt work
    response = post("/edit", data={
        "long_url":"nope.com",
        "title":"nope",
        "short_url": "custom-thing",
        "old_short_url": "1"
    })
    assert response.status_code != 302
    assert response.status_code < 500

    # not on index
    response = get("/")
    text = str(response.get_data())
    assert "nope" not in text

@loginw("power")
def test_edit_link_power():
    mclient.shrunk_urls.urls.insert({
        "_id": "1", "title": "lmao1",
        "long_url": "https://google.com",
        "timeCreated": datetime.datetime.now(),
        "netid": "DEV_PWR_USER"
    })

    # test reserved link
    in_post_resp("/edit", "That name is reserved", {
        "long_url":"google.com",
        "title":"lmao",
        "short_url": "admin",
        "old_short_url": "1"
    })

    # shorturl works
    response = post("/edit", data={
        "long_url": "facebook.com",
        "title": "new-title",
        "short_url": "customthing",
        "old_short_url": "1"
    })
    assert response.status_code == 302
    # make sure link shows up on page
    response = get("/")
    text = str(response.get_data())
    assert "new-title" in text
    assert "facebook.com" in text
    assert "customthing" in text

@loginw("user")
def test_index_options():
    """test all sortby options to make sure they don't crash"""

    urls = ["/?sortby=" + option for option in list(map(str,(range(4)))) + ['']]
    responses = [get(url) for url in urls]
    for response in responses:
        assert response.status_code < 500

    response = get("/?sortby=invalid")
    assert response.status_code == 400

@loginw("user")
def test_index_search():
    """make sure search checks all feilds"""
    mclient.shrunk_urls.urls.insert({
        "_id": "id1", "title": "lmao1",
        "long_url": "https://google.com",
        "timeCreated": datetime.datetime.now(),
        "netid": "DEV_USER"
    })

    def find(search, intext, base="/?search="):
        response = get(base + quote(search))
        assert response.status_code < 500
        text = str(response.get_data())
        assert intext in text

    #search by title
    find("lmao", "lmao1")
    #search by long_url
    find("google", "google.com")
    #search by short_url
    find("id", "id1")

    #admin
    logout()
    login("admin")
    #search by netid
    find("DEV", "Showing results for", base="/?all_users=1&search=")

def test_index_admin():
    """make sure admin options dont appear for users"""
    mclient.shrunk_urls.urls.insert({
        "_id": "id1", "title": "lmao1",
        "long_url": "https://google.com",
        "timeCreated": datetime.datetime.now(),
        "netid": "dad"
    })
    urls = ["/?all_users=0", "?all_users=1"]
    login("user")
    for response in [get(url) for url in urls]:
        assert response.status_code < 500
        text = str(response.get_data())
        assert "lmao1" not in text
        assert "Admin" not in text
    logout()

    login("admin")
    #my links
    response = get(urls[0])
    assert response.status_code < 500
    text = str(response.get_data())
    assert "Admin" in text

    assert "lmao1" not in text

    #other's links
    response = get(urls[1])
    assert response.status_code < 500
    text = str(response.get_data())
    assert "Admin" in text

    assert "lmao1" in text

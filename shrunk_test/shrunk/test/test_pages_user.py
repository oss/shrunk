import datetime
from urllib.parse import quote
import json

from shrunk.appserver import app
import shrunk.roles as roles
from views import login, logout, get, post, loginw, assert_redirect
from shrunk.config import GEOLITE_PATH

app.initialize()
app.switch_db("shrunk_test")
sclient = app.get_shrunk()
sclient._set_geoip(GEOLITE_PATH)
mclient = sclient._mongo


def teardown_function():
    mclient.drop_database("shrunk_test")
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
    assert response.status_code == 200
    short_url = json.loads(str(response.get_data(), 'utf8'))['success']['short_url']
    assert_redirect(get('/' + short_url.split('/')[-1]), 'google.com')

    # make sure link shows up on page
    response = get("/")
    text = str(response.get_data())
    assert "lmao" in text
    assert "google.com" in text

    # shorturl doesnt work
    response = post("/add", data={
        "long_url": "nope.com",
        "title": "nope",
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
        "long_url": "google.com",
        "title": "lmao",
        "short_url": "admin"
    })

    # shorturl works
    response = post("/add", data={
        "long_url": "google.com",
        "title": "lmao",
        "short_url": "customthing"
    })
    assert response.status_code == 200
    # make sure link shows up on page
    response = get("/")
    text = str(response.get_data())
    assert "lmao" in text
    assert "google.com" in text
    assert "customthing" in text


def test_delete():
    mclient.shrunk_test.urls.insert_many([
        {"_id": "1", "title": "lmao1",
         "long_url": "https://google.com", "netid": "DEV_USER"},
        {"_id": "2", "title": "lmao2",
         "long_url": "https://google.com", "netid": "dude"}
    ])

    # confirm normal delete
    logout()
    login("user")
    response = post("/delete", data={"short_url": "1"})
    assert response.status_code == 302
    response = get("/")
    text = str(response.get_data())
    assert "lmao1" not in text
    assert mclient.shrunk_test.urls.find_one({"_id": "1"}) is None

    # confirm user cant delete another users link
    # TODO show a message to user telling them they cant delete that link?
    response = post("/delete", data={"short_url": "2"})
    assert response.status_code == 401
    assert mclient.shrunk_test.urls.find_one({"_id": "2"}) is not None

    # confirm power user cant delete another users link
    logout()
    login("power")
    response = post("/delete", data={"short_url": "2"})
    assert response.status_code == 401
    assert mclient.shrunk_test.urls.find_one({"_id": "2"}) is not None

    # confirm admin can delete
    logout()
    login("admin")
    response = post("/delete", data={"short_url": "2"})
    assert response.status_code == 302
    assert mclient.shrunk_test.urls.find_one({"_id": "2"}) is None


@loginw("user")
def test_edit_link():
    mclient.shrunk_test.urls.insert_one({
        '_id': 'short1',
        'title': 'lmao1',
        'long_url': 'https://google.com',
        'timeCreated': datetime.datetime.now(),
        'netid': 'DEV_USER'
    })

    # invalid urls
    for url in ['ay', '', 'longerrrrrr']:
        print(url)
        in_post_resp('/edit', 'Please enter a valid URL.', {
            'long_url': url,
            'title': 'lmao1',
            'short_url': 'short1',
            'old_short_url': 'short1'
        })

    # invalid title
    in_post_resp('/edit', 'Please enter a title.', {
        'title': '',
        'long_url': 'google.com',
        'short_url': 'short1',
        'old_short_url': 'short1'
    })

    # can't be blocked
    roles.grant('blocked_url', 'anti-foo-man', 'https://foo.com')
    in_post_resp('/edit', 'That URL is not allowed.', {
        'long_url': 'https://lmao.foo.com/sus.php',
        'title': 'lmao',
        'short_url': 'short1',
        'old_short_url': 'short1'
    })

    # proper insert
    response = post('/edit', data={
        'long_url': 'facebook.com',
        'title': 'new-lmao',
        'short_url': 'short1',
        'old_short_url': 'short1'
    })
    assert response.status_code == 200
    # make sure link shows up on page
    response = get('/')
    text = str(response.get_data())
    assert 'new-lmao' in text
    assert 'facebook.com' in text

    # shorturl doesnt work
    response = post('/edit', data={
        'long_url': 'nope.com',
        'title': 'nope',
        'short_url': 'custom-thing',
        'old_short_url': 'short1'
    })
    assert response.status_code != 302
    assert response.status_code < 500

    # not on index
    response = get('/')
    text = str(response.get_data())
    assert 'nope' not in text


@loginw("power")
def test_edit_link_power():
    mclient.shrunk_test.urls.insert_one({
        '_id': 'short1',
        'title': 'lmao1',
        'long_url': 'https://google.com',
        'timeCreated': datetime.datetime.now(),
        'netid': 'DEV_PWR_USER'
    })

    # test reserved link
    in_post_resp('/edit', 'That name is reserved', {
        'long_url': 'google.com',
        'title': 'lmao',
        'short_url': 'admin',
        'old_short_url': 'short1'
    })

    # shorturl works
    response = post('/edit', data={
        'long_url': 'facebook.com',
        'title': 'new-title',
        'short_url': 'customthing',
        'old_short_url': 'short1'
    })
    assert response.status_code == 200
    # make sure link shows up on page
    response = get('/')
    text = str(response.get_data())
    assert 'new-title' in text
    assert 'facebook.com' in text
    assert 'customthing' in text


@loginw("user")
def test_index_options():
    """test all sortby options to make sure they don't crash"""

    urls = ["/?sortby=" + option for option in list(map(str, (range(4)))) + ['']]
    responses = [get(url) for url in urls]
    for response in responses:
        assert response.status_code < 500

    # when sortby is invalid shrunk should default to '0'
    response = get("/?sortby=invalid")
    assert response.status_code == 200


@loginw("user")
def test_index_search():
    """make sure search checks all fields"""
    mclient.shrunk_test.urls.insert_one({
        "_id": "id1", "title": "lmao1",
        "long_url": "https://google.com",
        "timeCreated": datetime.datetime.now(),
        "netid": "DEV_USER"
    })

    def find(search, intext, base="/?query="):
        response = get(base + quote(search))
        assert response.status_code < 500
        text = str(response.get_data())
        app.logger.info(text)
        assert intext in text

    # search by title
    find("lmao", "lmao1")
    # search by long_url
    find("google", "google.com")
    # search by short_url
    find("id", "id1")

    # admin
    logout()
    login("admin")
    # search by netid
    find("DEV", "DEV", base="/?all_users=1&query=")
    # this assumes that the DEV_ADMIN user does not have any links in the test db...
    find("DEV", "No results found for query", base="/?all_users=0&query=NO_RESULTS_QUERY")


def test_index_admin():
    """ Make sure admin options don't appear for normal users. """
    mclient.shrunk_test.urls.insert_one({
        '_id': 'id1',
        'title': 'lmao1',
        'long_url': 'https://google.com',
        'timeCreated': datetime.datetime.now(),
        'netid': 'dad'
    })
    urls = ['/?links_set=GO!my', '/?links_set=GO!all']
    login('user')
    for response in [get(url) for url in urls]:
        assert response.status_code < 500
        text = str(response.get_data())
        assert 'lmao1' not in text
        assert 'Admin' not in text
    logout()

    login('admin')
    # my links
    response = get(urls[0])
    assert response.status_code == 200
    text = str(response.get_data())
    assert 'Admin' in text
    assert 'lmao1' not in text

    login('admin')
    # all links
    response = get(urls[1])
    assert response.status_code == 200
    text = str(response.get_data())
    assert 'Admin' in text
    assert 'lmao1' in text


@loginw("user")
def test_stats():
    short = sclient.create_short_url('google.com')
    sclient.visit(short, '127.0.0.1', 'user agent', 'ref')

    response = get('/stats?url=' + short)
    assert response.status_code == 200
    assert 'Export visit data as CSV' in str(response.get_data())

    response = get('/stats?url=invalid')
    assert 'URL not found :(' in str(response.get_data())


@loginw("admin")
def test_visits_csv():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    sclient.visit(short, '127.0.0.1', 'Mozzarella Foxfire', 'https://referor.com')
    sclient.visit(short, '196.168.1.1', 'Goggle Chrom', 'https://refuror.org')

    response = get('/link-visits-csv?url=' + short)
    assert response.status_code == 200
    lines = str(response.get_data(), 'utf8').split('\r\n')
    assert len(lines) == 4
    assert lines[-1] == ''

    [a, b] = lines[1], lines[2]
    if 'Chrom' in a:
        a, b = b, a

    assert 'Mozzarella Foxfire' in a
    assert 'referor.com' in a

    assert 'Goggle Chrom' in b
    assert 'refuror.org' in b


@loginw("admin")
def test_visits_csv_no_url():
    response = get('/link-visits-csv')
    assert response.status_code == 400
    assert 'error: request must have url' in str(response.get_data())


@loginw("user")
def test_visits_no_perm():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    response = get('/link-visits-csv?url=' + short)
    assert response.status_code == 401


@loginw("admin")
def test_search_visits_csv():
    short0 = sclient.create_short_url('google.com', netid='shrunk_test')
    sclient.visit(short0, '1.2.3.4', 'visitor0', 'referer')
    sclient.visit(short0, '1.2.3.4', 'visitor1', 'referer')
    short1 = sclient.create_short_url('yahoo.com', netid='shrunk_test')
    sclient.visit(short1, '1.2.3.4', 'visitor1', 'referer')
    short2 = sclient.create_short_url('bing.com', netid='shrunk_test')
    sclient.visit(short2, '1.2.3.4', 'visitor2', 'referer')

    resp = get('/search-visits-csv?links_set=GO!all&query=google')
    assert resp.status_code == 200
    csv = str(resp.get_data(), 'utf8')
    assert 'visitor0' in csv and 'visitor1' in csv
    assert 'visitor2' not in csv

    resp = get('/search-visits-csv?links_set=GO!all&query=yahoo')
    assert resp.status_code == 200
    csv = str(resp.get_data(), 'utf8')
    assert 'visitor1' in csv
    assert 'visitor0' not in csv and 'visitor2' not in csv

    resp = get('/search-visits-csv?links_set=GO!all&query=bing')
    assert resp.status_code == 200
    csv = str(resp.get_data(), 'utf8')
    assert 'visitor2' in csv
    assert 'visitor0' not in csv and 'visitor1' not in csv


@loginw("admin")
def test_geoip_csv():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    ips = ['165.230.224.67', '34.201.163.243', '35.168.234.184',
           '107.77.70.130', '136.243.154.93', '94.130.167.121']
    for ip in ips:
        sclient.visit(short, ip, 'user agent', 'referer')

    # test state-level csv
    response = get('/geoip-csv?resolution=state&url=' + short)
    assert response.status_code == 200
    csv = str(response.get_data(), 'utf8').split('\n')
    assert csv[0] == 'location,visits'
    expected = ['BY,1', 'NJ,1', 'NY,1', 'VA,2', 'unknown,1']
    print(sorted(csv[1:]))
    print(sorted(expected))
    assert sorted(csv[1:]) == sorted(expected)

    # test country-level csv
    response = get('/geoip-csv?resolution=country&url=' + short)
    assert response.status_code == 200
    csv = str(response.get_data(), 'utf8').split('\n')
    assert csv[0] == 'location,visits'
    expected = ['United States,4', 'Germany,2']
    assert sorted(csv[1:]) == sorted(expected)

    response = get('/geoip-csv')
    assert response.status_code == 400
    assert 'error: request must have url' in str(response.get_data())

    response = get('/geoip-csv?url=' + short)
    assert response.status_code == 400
    assert 'error: request must have resolution' in str(response.get_data())

    response = get('/geoip-csv?resolution=world&url=' + short)
    assert response.status_code == 400
    assert 'error: invalid resolution' in str(response.get_data())


@loginw("user")
def test_geoip_no_perm():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    response = get('/geoip-csv?resolution=state&url=' + short)
    assert response.status_code == 401


@loginw("admin")
def test_useragent_stats():
    short = sclient.create_short_url('google.com', netid='shrunk_test')

    def check_stats(expected):
        response = get('/useragent-stats?url=' + short)
        assert response.status_code == 200
        actual = json.loads(str(response.get_data(), 'utf8'))
        assert actual == expected

    check_stats({})

    sclient.visit(short, '127.0.0.1',
                  'Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0',
                  'referer')
    check_stats({'platform': {'Linux': 1}, 'browser': {'Firefox': 1}})

    sclient.visit(short, '127.0.0.1',
                  'Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0',
                  'referer')
    check_stats({'platform': {'Linux': 2}, 'browser': {'Firefox': 2}})

    sclient.visit(short, '127.0.0.1',
                  'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
                  'referer')
    check_stats({'platform': {'Linux': 2, 'Windows': 1}, 'browser': {'Firefox': 3}})

    sclient.visit(short, '127.0.0.1',
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299', 'referer')
    check_stats({'platform': {'Linux': 2, 'Windows': 2}, 'browser': {'Firefox': 3, 'Msie': 1}})


@loginw("admin")
def test_useragent_stats_no_visit():
    """ We need to be able to handle visit documents without a user_agent field. """
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    mclient.shrunk_test.visits.insert_one({
        'short_url': short,
        'source_ip': '127.0.0.1',
        'time': datetime.datetime.now()
    })
    response = get('/useragent-stats?url=' + short)
    assert response.status_code == 200

    assert json.dumps({'platform': {'unknown': 1}, 'browser': {'unknown': 1}}) \
        == str(response.get_data(), 'utf8')


@loginw("user")
def test_useragent_stats_no_url():
    response = get('/useragent-stats')
    assert response.status_code == 400
    assert 'error: request must have url' in str(response.get_data())


@loginw("user")
def test_useragent_stats_no_perm():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    response = get('/useragent-stats?url=' + short)
    assert response.status_code == 401
    assert 'Unauthorized' in str(response.get_data())


@loginw("admin")
def test_referer_stats():
    short = sclient.create_short_url('google.com', netid='shrunk_test')

    def check_stats(expected):
        response = get('/referer-stats?url=' + short)
        assert response.status_code == 200
        actual = json.loads(str(response.get_data(), 'utf8'))
        assert expected == actual

    check_stats({})

    sclient.visit(short, '127.0.0.1', 'user agent', 'https://facebook.com')
    check_stats({'facebook.com': 1})

    sclient.visit(short, '127.0.0.1', 'user agent', 'https://facebook.com')
    check_stats({'facebook.com': 2})

    sclient.visit(short, '127.0.0.1', 'user agent', 'https://twitter.com/tweet')
    check_stats({'facebook.com': 2, 'twitter.com': 1})

    sclient.visit(short, '127.0.0.1', 'user agent', 'https://old.reddit.com/r/rutgers')
    check_stats({'facebook.com': 2, 'twitter.com': 1, 'old.reddit.com': 1})


@loginw("user")
def test_referer_stats_no_perm():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    response = get('/referer-stats?url=' + short)
    assert response.status_code == 401
    assert 'Unauthorized' in str(response.get_data())


@loginw("admin")
def test_monthly_visits():
    short = sclient.create_short_url('google.com', netid='shrunk_test')

    def make_visit(who, year, month):
        mclient.shrunk_test.visits.insert_one({
            'short_url': short,
            'source_ip': who,
            'time': datetime.datetime(year, month, 1)
        })

    def check_visits(expected):
        response = get('/monthly-visits?url=' + short)
        assert response.status_code == 200
        actual = json.loads(str(response.get_data(), 'utf8'))
        assert expected == actual

    check_visits([])

    make_visit('127.0.0.1', 2019, 1)
    check_visits([{'first_time_visits': 1, 'all_visits': 1,
                   '_id': {'day': '1', 'month': 1, 'year': 2019}}])

    make_visit('127.0.0.1', 2019, 1)
    check_visits([{'first_time_visits': 1, 'all_visits': 2,
                   '_id': {'day': '1', 'month': 1, 'year': 2019}}])

    make_visit('127.0.0.2', 2019, 1)
    check_visits([{'first_time_visits': 2, 'all_visits': 3,
                   '_id': {'day': '1', 'month': 1, 'year': 2019}}])

    make_visit('127.0.0.1', 2019, 2)
    check_visits([{'first_time_visits': 2, 'all_visits': 3,
                   '_id': {'day': '1', 'month': 1, 'year': 2019}},
                  {'first_time_visits': 0, 'all_visits': 1,
                   '_id': {'day': '1', 'month': 2, 'year': 2019}}])

    make_visit('127.0.0.3', 2019, 2)
    check_visits([{'first_time_visits': 2, 'all_visits': 3,
                   '_id': {'day': '1', 'month': 1, 'year': 2019}},
                  {'first_time_visits': 1, 'all_visits': 2,
                   '_id': {'day': '1', 'month': 2, 'year': 2019}}])


@loginw("user")
def test_monthly_visits_no_url():
    response = get('/monthly-visits')
    assert response.status_code == 400


@loginw("user")
def test_monthly_visits_no_perm():
    short = sclient.create_short_url('google.com', netid='shrunk_test')
    response = get('/monthly-visits?url=' + short)
    assert response.status_code == 401
    assert 'Unauthorized' in str(response.get_data())

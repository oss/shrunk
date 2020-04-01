""" shrunk - Rutgers University URL Shortener

Unit tests for the database.
"""

import pytest

import shrunk.client
import shrunk.client.exceptions


def insert_urls(db, long_urls, netid):
    return [db.create_short_url(url, netid=netid) for url in long_urls]


def get_url(db, url):
    return db.db.urls.find_one({'short_url': url, 'deleted': {'$ne': True}})


# TODO add more testing in the case of blocked urls, already take ones, reserved words, banned user
# TODO test custom short_urls
# TODO test for can't have shorturl if not admin or power user


def test_urls(db, app):
    """ Puts and retrieves URLs from the database. """
    with app.app_context():
        long_urls = ['foo.com', 'bar.net', 'báz7.edu.fr']
        short_urls = insert_urls(db, long_urls, 'shrunk_test')
        results = [db.get_long_url(url) for url in short_urls]
        assert sorted(long_urls) == sorted(results)


def test_visit(db, app):
    """Tests logic when "visiting" a URL."""
    with app.app_context():
        long_url = 'http://www.foobar.net/index'
        short_url = db.create_short_url(long_url, netid='shrunk_test')
        assert short_url is not None

        hits = 4
        for _ in range(hits):
            db.visit(short_url, 'tracking_id', '127.0.0.1', 'tester', 'https://test.com')
        assert db.get_num_visits(short_url) == hits


def test_invalid_sort(db):
    with pytest.raises(IndexError):
        db.search(sort=100)


def test_172_geoip(db):
    assert db.get_geoip_location(
        '172.31.0.0') == 'Rutgers New Brunswick, New Jersey, United States'
    assert db.get_geoip_location('172.27.0.0') == 'Rutgers Newark, New Jersey, United States'
    assert db.get_geoip_location('172.24.0.0') == 'Rutgers Camden, New Jersey, United States'
    assert db.get_geoip_location('172.0.0.0') == 'New Jersey, United States'
    assert db.get_location_codes('172.0.0.1') == ('NJ', 'US')


def test_count(db, app):
    """Test to see if links are counted correctly"""

    with app.app_context():
        insert_urls(db, ['aa.com', 'bb.com'], 'alice')
        insert_urls(db, ['cc.com', 'dd.com', 'ee.com'], 'bob')

        assert db.count_links(netid='alice') == 2
        assert db.count_links(netid='bob') == 3
        assert db.count_links() == 5


def test_create(db, app):
    with app.app_context():
        db.grant_role('blocked_url', 'ltorvalds', 'https://microsoft.com')
        db.create_short_url('https://linux.org', netid='dude', title='title',
                            short_url='custom-link')

        # can't create a link that is blocked
        with pytest.raises(shrunk.client.exceptions.ForbiddenDomainException):
            db.create_short_url('https://microsoft.com/custom', netid='dude',
                                short_url='custom-link2')

        # can't use somone else's link
        with pytest.raises(shrunk.client.exceptions.DuplicateIdException):
            db.create_short_url('https://lmao.com/custom', netid='dude', short_url='custom-link')

        with pytest.raises(shrunk.client.exceptions.ForbiddenNameException):
            db.create_short_url('https://lmao.com/custom', netid='dude', short_url='shrunk-login')


def test_modify(db, app):
    """Make sure modifing the url sets the new info properly."""
    with app.app_context():
        db.grant_role('blocked_url', 'ltorvalds', 'https://microsoft.com')
        url = db.create_short_url('https://linux.org', netid='dude', title='title')
        db.create_short_url('https://linux.org/custom', netid='dude', short_url='custom-link')
        db.create_short_url('https://linux.org/custom4', netid='dude', short_url='custom-link4')

        def modify(**newargs):
            args = {
                'old_short_url': url,
                'long_url': 'https://linux.org'
            }
            args.update(newargs)
            return db.modify_url(**args)

        # can't edit to blocked urls
        with pytest.raises(shrunk.client.exceptions.ForbiddenDomainException):
            modify(long_url='https://microsoft.com')

        with pytest.raises(shrunk.client.exceptions.ForbiddenDomainException):
            modify(long_url='https://ComL3te-MeSs.mIcroSoft.cOm/of-AllofTh3m/4.aspx')

        # can't edit to a reserved word
        with pytest.raises(shrunk.client.exceptions.ForbiddenNameException):
            modify(short_url='logout')

        # can't edit to an already taken short url
        with pytest.raises(shrunk.client.exceptions.BadShortURLException):
            modify(short_url='custom-link')

        # all new information should be set
        modify(title='new-title', long_url='https://linux.org/other-page.html')
        new_url = get_url(db, url)
        assert new_url['title'] == 'new-title'
        assert new_url['long_url'] == 'https://linux.org/other-page.html'


def test_is_owner_or_admin(db, app):
    """test utility function to see if somone can modify a url"""

    with app.app_context():
        url = db.create_short_url('https://linux.org', netid='dude')
        print(url)
        db.db.grants.insert_one({'role': 'admin', 'entity': 'dnolen', 'granted_by': 'rhickey'})

        assert db.is_owner_or_admin(url, 'dude')
        assert db.is_owner_or_admin(url, 'dnolen')
        assert not db.is_owner_or_admin(url, 'bgates')

        # nonexistent url
        assert db.is_owner_or_admin('hogwash', 'dnolen')
        assert not db.is_owner_or_admin('hogwash', 'dude')


def make_urls(db, num_visits, num_visits2):
    url = db.create_short_url('https://linux.org', netid='dude')
    url2 = db.create_short_url('https://linux.org/other', netid='dude')
    for _ in range(num_visits):
        db.visit(url, 'tracking_id', '127.0.0.1', 'tester', 'https://test.com')

    for _ in range(num_visits2):
        db.visit(url2, 'tracking_id', '127.0.0.1', 'tester', 'https://test.com')
    return url, url2


def test_visit2(db, app):
    with app.app_context():
        num_visits1 = 3
        num_visits2 = 4
        url1, url2 = make_urls(db, num_visits1, num_visits2)

        id1 = db.get_url_id(url1)
        id2 = db.get_url_id(url2)

        visits1 = list(db.db.visits.find({'link_id': id1}))
        assert get_url(db, url1)['visits'] == num_visits1
        assert len(visits1) == num_visits1

        visits2 = list(db.db.visits.find({'link_id': id2}))
        assert get_url(db, url2)['visits'] == num_visits2
        assert len(visits2) == num_visits2


def test_delete_and_visit(db, app):
    with app.app_context():
        """test utility function to see if somone can modify a url"""
        db.db.grants.insert_one({'role': 'admin', 'entity': 'dnolen', 'granted_by': 'rhickey'})
        db.db.grants.insert_one({
            'role': 'power_user',
            'netid': 'power_user',
            'added_by': 'Justice League'
        })

        num_visits = 3
        num_visits2 = 4
        url, url2 = make_urls(db, num_visits, num_visits2)
        id2 = db.get_url_id(url2)

        def assert_delete(deletion):
            assert deletion.modified_count == 1

        # only owner or admin can delete not power_user or user
        with pytest.raises(shrunk.client.exceptions.AuthenticationException):
            db.delete_url(url, 'user')
        assert get_url(db, url)['visits'] == num_visits

        # power
        with pytest.raises(shrunk.client.exceptions.AuthenticationException):
            db.delete_url(url, 'power_user')
        assert get_url(db, url)['visits'] == num_visits

        # cant delete nonexistent link
        with pytest.raises(shrunk.client.exceptions.NoSuchLinkException):
            db.delete_url('reasons-to-use-windows', 'dnolen')

        # admin
        assert_delete(db.delete_url(url, 'dnolen'))

        # deleting a url will remove it from urls
        assert get_url(db, url) is None

        # deleting one url shouldn't affect the visits of another
        visits4 = list(db.db.visits.find({'link_id': id2}))
        assert get_url(db, url2)['visits'] == num_visits2
        assert len(visits4) == num_visits2

        # owner can delete their own link
        assert_delete(db.delete_url(url2, 'dude'))
        assert get_url(db, url2) is None


def test_get_url_info(db, app):
    with app.app_context():
        url = db.create_short_url('https://linux.org', netid='dude', title='my link')

        # returns info with keys
        url_info = db.get_url_info(url)
        assert url_info['timeCreated'] is not None
        assert url_info['title'] is not None
        assert url_info['long_url'] is not None
        assert url_info['netid'] is not None
        assert url_info['visits'] is not None
        assert url_info['_id'] is not None

        # nonexistent is None
        url_info2 = db.get_url_info('hogwash')
        assert url_info2 is None


def test_get_long_url(db, app):
    with app.app_context():
        url = db.create_short_url('https://linux.org', netid='dude')

        # gives long url
        assert db.get_long_url(url) == 'https://linux.org'

        # nonexistent is None
        assert db.get_long_url('hogwash') is None


def test_get_visits(db, app):
    with app.app_context():
        num_visits = 3
        num_visits2 = 4
        url, url2 = make_urls(db, num_visits, num_visits2)
        url3 = db.create_short_url('https://linux.org/third', netid='dude')
        id1 = db.get_url_id(url)
        id2 = db.get_url_id(url2)

        expected_visits = {visit['link_id'] for visit in db.db.visits.find({'link_id': id1})}
        expected_visits2 = {visit['link_id'] for visit in db.db.visits.find({'link_id': id2})}

        actual_visits = {visit['link_id'] for visit in db.get_visits(url)}
        actual_visits2 = {visit['link_id'] for visit in db.get_visits(url2)}

        assert expected_visits == actual_visits
        assert expected_visits2 == actual_visits2

        assert db.get_visits(url3).total_results == 0

        # nonexistent should be None
        assert db.get_visits('hogwash').total_results == 0


def test_get_num_visits(db, app):
    with app.app_context():
        num_visits = 3
        num_visits2 = 4
        url, url2 = make_urls(db, num_visits, num_visits2)

        url3 = db.create_short_url('https://linux.org/third', netid='dude')

        assert db.get_num_visits(url) == num_visits
        assert db.get_num_visits(url2) == num_visits2

        # if the url exists but no one has visited it should give 0
        assert db.get_num_visits(url3) == 0

        # nonexistent should be None
        assert db.get_num_visits('hogwash') is None


def test_get_all_urls(db, app):
    with app.app_context():
        long_urls = ['https://microsoft.com',
                     'http://microsoft.com',
                     'https://microsoft.com/page.aspx']
        insert_urls(db, long_urls, 'bgates')
        all_urls = {url['long_url'] for url in db.search()}
        assert all(url in all_urls for url in long_urls)


def assert_visit(visit, all_visits, first_time, month=None, year=None):
    """util for testing monthly aggregation"""
    assert visit['all_visits'] == all_visits
    assert visit['first_time_visits'] == first_time
    if month:
        assert visit['_id']['month'] == month
    if year:
        assert visit['_id']['year'] == year


def test_get_daily_visits(db, app):
    with app.app_context():
        num_visits = 3
        num_visits2 = 4
        url, url2 = make_urls(db, num_visits, num_visits2)

        url3 = db.create_short_url('https://linux.org/third', netid='dude')
        db.create_short_url('https://linux.org/fifth', netid='dude')

        visits = list(db.get_daily_visits(url))
        visits2 = list(db.get_daily_visits(url2))
        visits3 = list(db.get_daily_visits(url3))  # exists but no visits
        with pytest.raises(shrunk.client.exceptions.NoSuchLinkException):
            db.get_daily_visits('hogwash')

        assert len(visits) == 1  # only one months worth of visits
        assert len(visits2) == 1
        assert len(visits3) == 0  # no months

        assert_visit(visits[0], num_visits, first_time=1)
        assert_visit(visits2[0], num_visits2, first_time=1)


def test_get_urls(db, app):
    # calling list on get_urls or iterating over it will consume it and
    # you won't be able to list() it or iterate on it again
    # <rolls eyes>
    with app.app_context():
        long_urls = ['https://microsoft.com',
                     'http://microsoft.com',
                     'https://microsoft.com/page.aspx']
        uname = 'bgates'
        short_urls = insert_urls(db, long_urls, uname)

        user_urls = db.search(netid=uname)
        assert len(user_urls) == len(long_urls)
        user_short_urls = {url['short_url'] for url in user_urls}

        for user_url in user_urls:
            assert user_url['netid'] == uname

        for url in short_urls:
            assert url in user_short_urls


def test_search(db, app):
    with app.app_context():
        def shortURL(url, title):
            return db.create_short_url(url, netid='shrunk_test', title=title)
        url = shortURL('https://linux.org', 'one')
        url2 = shortURL('https://thing.org', 'other')
        url3 = shortURL('https://thing.com', 'another')

        def assert_title(title, search_result):
            assert title in {link['title'] for link in search_result}

        def assert_id(_id, search_result):
            assert _id in {link['short_url'] for link in db.search(query='LiNuX')}

        # match url or title
        assert_id(url, db.search(query='linux'))
        assert_title('one', db.search(query='one'))

        # case insensitive
        assert_title('one', db.search(query='oNe'))
        assert_title('one', db.search(query='ONE'))
        assert_id(url, db.search(query='LiNuX'))
        assert_id(url, db.search(query='LINUX'))

        # multiple in a result
        result = {link['short_url'] for link in db.search(query='org')}
        assert url in result
        assert url2 in result

        # multiple in title
        result2 = {link['title'] for link in db.search(query='otHer')}
        assert 'other' in result2
        assert 'another' in result2

        # search by netid
        result3 = {link['short_url'] for link in db.search(query='shrunk_test')}
        assert url in result3
        assert url2 in result3
        assert url3 in result3


def test_search_netid(db, app):
    with app.app_context():
        url = db.create_short_url('https://test.com', netid='Billie Jean', title='title')
        url2 = db.create_short_url('https://test.com', netid='Knott MyLova', title='title')

        def assert_len(length, keyword, netid=None):
            assert len(list(db.search(query=keyword, netid=netid))) == length

        def assert_search(keyword, netid, url):
            assert list(db.search(query=keyword, netid=netid))[0]['short_url'] == url

        # searches with netid should screen search results withought that netid
        assert_len(1, 'test', 'Billie Jean')
        assert_len(1, 'test', 'Knott MyLova')

        assert_len(1, 'title', 'Billie Jean')
        assert_len(1, 'title', 'Knott MyLova')

        # searches without netid should have both
        assert_len(2, 'test')
        assert_len(2, 'title')

        # users should get their own links
        assert_search('test', 'Billie Jean', url)
        assert_search('title', 'Billie Jean', url)

        assert_search('test', 'Knott MyLova', url2)
        assert_search('title', 'Knott MyLova', url2)


@pytest.mark.parametrize(('ip', 'state_exp', 'country_exp'), [
    ('66.249.88.21', None, 'US'),
    ('165.230.224.67', 'NJ', 'US'),
    ('34.201.163.243', 'VA', 'US'),
    ('35.168.234.184', 'VA', 'US'),
    ('107.77.70.130', 'NY', 'US'),
    ('136.243.154.93', None, 'DE'),
    ('94.130.67.121', None, 'DE')])
def test_get_location_codes(db, ip, state_exp, country_exp):
    state_act, country_act = db.get_location_codes(ip)
    assert state_exp == state_act
    assert country_exp == country_act


@pytest.mark.parametrize(('ip', 'suffix'), [
    ('66.249.88.21', 'United States'),
    ('165.230.224.67', 'New Jersey, United States'),
    ('34.201.163.243', 'Ashburn, Virginia, United States'),
    ('35.168.234.184', 'Ashburn, Virginia, United States'),
    ('107.77.70.130', 'New York, New York, United States'),
    ('136.243.154.93', 'Germany'),
    ('94.130.167.121', 'Germany')])
def test_geoip_location(db, ip, suffix):
    assert db.get_geoip_location(ip).endswith(suffix)


@pytest.mark.parametrize('ip', ['165.230.224.67', '127.0.0.1', '8.8.8.8'])
def test_get_visitor_id(db, ip):
    id1 = db.get_visitor_id(ip)
    id2 = db.get_visitor_id(ip)
    assert id1 == id2


def test_bad_sort(db):
    with pytest.raises(IndexError):
        db.search(sort='bad')


def test_pop_sort(db, app):
    with app.app_context():
        url0 = db.create_short_url('http://0.example.com')
        url1 = db.create_short_url('http://1.example.com')
        db.visit(url0, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'http://example.com')
        db.visit(url0, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'http://example.com')
        db.visit(url1, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'http://example.com')

        results = db.search(sort=shrunk.client.SortOrder.POP_ASC).results
        assert results[0]['short_url'] == url1
        assert results[1]['short_url'] == url0

        results = db.search(sort=shrunk.client.SortOrder.POP_DESC).results
        assert results[0]['short_url'] == url0
        assert results[1]['short_url'] == url1


def test_remove_admin(db):
    db.create_organization('test-org')
    db.add_organization_admin('test-org', 'test-admin')
    assert db.is_organization_member('test-org', 'test-admin')
    assert db.is_organization_admin('test-org', 'test-admin')
    db.remove_organization_admin('test-org', 'test-admin')
    assert db.is_organization_member('test-org', 'test-admin')
    assert not db.is_organization_admin('test-org', 'test-admin')


def test_may_manage_organization(app, db):
    db.create_organization('test-org')
    db.add_organization_admin('test-org', 'test-admin')
    db.add_organization_member('test-org', 'test-member')
    assert db.may_manage_organization('test-org', 'test-admin') == 'admin'
    assert db.may_manage_organization('test-org', 'test-member') == 'member'
    with app.app_context():
        db.grant_role('admin', 'test', 'test-admin', None)
    assert db.may_manage_organization('test-org', 'test-admin') == 'site-admin'
    assert db.may_manage_organization('test-org', 'not-member') is False
    assert db.may_manage_organization('not-an-org', 'not-member') is False

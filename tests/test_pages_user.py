import datetime
import operator

import pytest

from util import assert_redirect, assert_status, assert_ok, assert_in_resp, assert_json, dev_login


@pytest.mark.parametrize('url', ['ay', '', 'longerrrr', '$%*#$%*('])
def test_invalid_url(client, url):
    with dev_login(client, 'user'):
        req = {
            'long_url': url,
            'title': 'testing'
        }

        assert_in_resp(client.post('/app/add', data=req), 'Please enter a valid URL.')


def test_missing_title(client):
    with dev_login(client, 'user'):
        req = {'long_url': 'google.com'}
        assert_in_resp(client.post('/app/add', data=req), 'Please enter a title.')


def test_blocked_url(db, client):
    with dev_login(client, 'user'):
        db.grant_role('blocked_url', 'anti-foo-man', 'https://foo.com')
        req = {
            'long_url': 'https://lmao.foo.com/sus.php',
            'title': 'testing'
        }
        assert_in_resp(client.post('/app/add', data=req), 'That URL is not allowed.')


def test_add_successfully(client):
    with dev_login(client, 'user'):
        req = {
            'long_url': 'google.com',
            'title': 'testing'
        }
        resp = client.post('/app/add', data=req)
        assert resp.status_code == 200
        short_url = resp.get_json()['success']['short_url'].split('/')[-1]
        assert_redirect(client.get(f'/{short_url}'), 'google.com')

        resp = client.get('/app/')
        assert_in_resp(resp, 'testing')
        assert_in_resp(resp, 'google.com')


def test_add_banned(client):
    with dev_login(client, 'user'):
        req = {
            'long_url': 'example.xxx',
            'title': 'example'
        }
        assert_status(client.post('/app/add', data=req), 400)


@pytest.mark.parametrize(('alias', 'err'), [
    ('a', 'Custom alias length must'),
    (70 * 'a', 'Custom alias length must'),
    ('!@#$%^', 'Custom alias must consist')])
def test_invalid_short_url(client, alias, err):
    with dev_login(client, 'user'):
        req = {
            'long_url': 'nope.com',
            'title': 'testing',
            'short_url': alias
        }
        resp = client.post('/app/add', data=req)
        assert_status(resp, 400)
        print(resp.get_data())
        assert_in_resp(resp, err)

        resp = client.get('/app/')
        with pytest.raises(AssertionError):
            assert_in_resp(resp, 'nope.com')


def test_add_reserved_link(client):
    with dev_login(client, 'power'):
        req = {
            'long_url': 'google.com',
            'title': 'testing',
            'short_url': 'admin'
        }
        assert_in_resp(client.post('/app/add', data=req), 'That name is reserved.')
        with pytest.raises(AssertionError):
            assert_in_resp(client.get('/app/'), 'google.com')


def test_add_alias_no_perm(client):
    with dev_login(client, 'user'):
        req = {
            'long_url': 'google.com',
            'title': 'testing',
            'short_url': 'customthing'
        }
        assert_status(client.post('/app/add', data=req), 403)


def test_add_alias_successfully(client):
    with dev_login(client, 'power'):
        req = {
            'long_url': 'google.com',
            'title': 'testing',
            'short_url': 'customthing'
        }
        assert_ok(client.post('/app/add', data=req))
        resp = client.get('/app/')
        assert_ok(resp)
        assert_in_resp(resp, 'google.com')
        assert_in_resp(resp, 'testing')
        assert_in_resp(resp, 'customthing')


def test_delete(db, client, app):
    with app.app_context():
        db.create_short_url('https://google.com', short_url='test0',
                            netid='DEV_USER', title='test0')
        db.create_short_url('https://yahoo.com', short_url='test1',
                            netid='NOT_DEV_USER', title='test1')

        with dev_login(client, 'user'):
            assert_ok(client.post('/app/delete', data={'short_url': 'test0'}))
            with pytest.raises(AssertionError):
                assert_in_resp(client.get('/app/'), 'google.com')

        for role in ['user', 'power']:
            with dev_login(client, role):
                assert_status(client.post('/app/delete', data={'short_url': 'test1'}), 403)
                assert db.search(query='test1').total_results == 1

        with dev_login(client, 'admin'):
            assert_ok(client.post('/app/delete', data={'short_url': 'test1'}))
            assert db.search(query='test1').total_results == 0
            with pytest.raises(AssertionError):
                assert_in_resp(client.get('/app/'), 'yahoo.com')


def test_delete_no_url(client):
    with dev_login(client, 'admin'):
        assert_status(client.post('/app/delete'), 400)
        assert_status(client.post('/app/delete', data={'short_url': ''}), 400)


def test_delete_no_such_url(client):
    with dev_login(client, 'admin'):
        assert_status(client.post('/app/delete', data={'short_url': 'does_not_exist'}), 400)


@pytest.fixture()
def short_url(db, app):
    with app.app_context():
        db.create_short_url('https://google.com', short_url='short1',
                            title='google', netid='DEV_USER')
    yield 'short1'


@pytest.fixture()
def short_url_power(db, app):
    with app.app_context():
        db.create_short_url('https://google.com', short_url='short1',
                            title='google', netid='DEV_PWR_USER')
    yield 'short1'


@pytest.mark.parametrize('url', ['ay', '', 'longerrrr', '$%*#$%*('])
def test_edit_invalid_url(client, short_url, url):
    with dev_login(client, 'user'):
        req = {
            'long_url': url,
            'title': 'google',
            'short_url': short_url,
            'old_short_url': short_url
        }
        resp = client.post('/app/edit', data=req)
        assert_status(resp, 400)
        assert_in_resp(resp, 'Please enter a valid URL.')


def test_edit_no_title(client, short_url):
    with dev_login(client, 'user'):
        req = {
            'long_url': 'google.com',
            'title': '',
            'short_url': short_url,
            'old_short_url': short_url
        }
        resp = client.post('/app/edit', data=req)
        assert_status(resp, 400)
        assert_in_resp(resp, 'Please enter a title.')


def test_edit_blocked(db, client, short_url):
    db.grant_role('blocked_url', 'anti-foo-man', 'https://foo.com')
    with dev_login(client, 'user'):
        req = {
            'long_url': 'https://lmao.foo.com/sus.php',
            'title': 'google',
            'short_url': short_url,
            'old_short_url': short_url
        }
        resp = client.post('/app/edit', data=req)
        assert_status(resp, 400)
        assert_in_resp(resp, 'That URL is not allowed.')


def test_edit_successfully(client, short_url):
    with dev_login(client, 'user'):
        req = {
            'long_url': 'facebook.com',
            'title': 'new-lmao',
            'short_url': short_url,
            'old_short_url': short_url
        }
        assert_ok(client.post('/app/edit', data=req))

        resp = client.get('/app/')
        assert_in_resp(resp, 'new-lmao')
        assert_in_resp(resp, 'facebook.com')

        assert_redirect(client.get(f'/{short_url}'), 'facebook.com')

        req = {
            'long_url': 'facebook.com',
            'title': 'new-lmao',
            'short_url': f'new{short_url}',
            'old_short_url': short_url
        }
        assert_status(client.post('/app/edit', data=req), 403)
        with pytest.raises(AssertionError):
            assert_in_resp(client.get('/app/'), f'new-{short_url}')


def test_edit_power(client, short_url_power):
    with dev_login(client, 'power'):
        req = {
            'long_url': 'google.com',
            'title': 'lmao',
            'short_url': 'admin',
            'old_short_url': short_url_power
        }
        resp = client.post('/app/edit', data=req)
        assert_status(resp, 400)
        assert_in_resp(resp, 'That name is reserved.')

        req['short_url'] = f'new{short_url_power}'
        assert_ok(client.post('/app/edit', data=req))

        resp = client.get('/app/')
        assert_in_resp(resp, f'new{short_url_power}')


def test_edit_no_perm(client, short_url):
    with dev_login(client, 'power'):
        req = {
            'long_url': 'google.com',
            'title': 'lmao',
            'short_url': 'admin',
            'old_short_url': short_url
        }
        assert_status(client.post('/app/edit', data=req), 403)


@pytest.mark.parametrize('sortby', list(range(4)) + ['invalid'])
def test_sortby(client, sortby):
    with dev_login(client, 'user'):
        assert_ok(client.get(f'/app/?sortby={sortby}'))


def test_search(db, client, app):
    with app.app_context():
        db.create_short_url('https://google.com', short_url='short1',
                            title='lmao1', netid='DEV_USER')

        def find(query, check, fmt='/app/?query={}'):
            resp = client.get(fmt.format(query))
            assert_ok(resp)
            assert_in_resp(resp, check)

        with dev_login(client, 'user'):
            find('lmao', 'lmao1')
            find('google', 'google.com')
            find('short1', 'short1')

        with dev_login(client, 'admin'):
            find('DEV', 'DEV', '/app/?links_set=GO!all&query={}')


def test_all_urls(client, short_url_power):
    with dev_login(client, 'power'):
        assert_in_resp(client.get('/app/'), short_url_power)
    with dev_login(client, 'user'):
        with pytest.raises(AssertionError):
            assert_in_resp(client.get('/app/?links_set=GO!all'), short_url_power)
    with dev_login(client, 'admin'):
        assert_in_resp(client.get('/app/?links_set=GO!all'), short_url_power)


def test_org_urls(db, client, app):
    with app.app_context():
        db.create_short_url('https://google.com', title='test0', netid='DEV_USER')
        db.create_short_url('https://google.com', title='test1', netid='DEV_PWR_USER')
        db.create_short_url('https://google.com', title='test2', netid='DEV_FACSTAFF')

        db.create_organization('test-org')
        db.add_organization_member('test-org', 'DEV_USER')
        db.add_organization_member('test-org', 'DEV_PWR_USER')

        with dev_login(client, 'user'):
            resp = client.get('/app/')
            assert_ok(resp)
            assert_in_resp(resp, 'test0')
            with pytest.raises(AssertionError):
                assert_in_resp(resp, 'test1')
            with pytest.raises(AssertionError):
                assert_in_resp(resp, 'test2')

            resp = client.get('/app/?links_set=test-org')
            assert_ok(resp)
            assert_in_resp(resp, 'test0')
            assert_in_resp(resp, 'test1')
            with pytest.raises(AssertionError):
                assert_in_resp(resp, 'test2')


def test_csv_link_0(db, client, short_url):
    db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'http://test.referrer.com')

    with dev_login(client, 'user'):
        resp = client.get(f'/app/stat/csv/link?url={short_url}')
        assert_ok(resp)
        assert_in_resp(resp, 'Test-User-Agent')
        assert_in_resp(resp, 'test.referrer.com')


def test_csv_link_1(db, client, app):
    with app.app_context():
        short = db.create_short_url('google.com', netid='DEV_USER')
        db.visit(short, 'tracking_id', '127.0.0.1', 'Mozzarella Foxfire', 'https://referor.com')
        db.visit(short, 'tracking_id', '196.168.1.1', 'Goggle Chrom', 'https://refuror.org')

        with dev_login(client, 'user'):
            resp = client.get(f'/app/stat/csv/link?url={short}')
            assert_ok(resp)
            lines = str(resp.get_data(), 'utf8').split('\r\n')

        assert len(lines) == 4
        assert lines[-1] == ''

        [a, b] = lines[1], lines[2]
        if 'Chrom' in a:
            a, b = b, a

        assert 'Mozzarella Foxfire' in a
        assert 'referor.com' in a

        assert 'Goggle Chrom' in b
        assert 'refuror.org' in b


def test_visits_csv_no_url(client):
    with dev_login(client, 'admin'):
        assert_status(client.get('/app/stat/csv/link'), 400)
        assert_status(client.get('/app/stat/csv/link?url='), 400)


def test_visits_no_perm(db, client, app):
    with app.app_context():
        short = db.create_short_url('google.com', netid='shrunk_test')
        with dev_login(client, 'user'):
            assert_status(client.get(f'/app/stat/csv/link?url={short}'), 403)


def test_visits_daily_no_perm(db, client, app):
    with app.app_context():
        short = db.create_short_url('google.com', netid='shrunk_test')
        with dev_login(client, 'user'):
            assert_status(client.get(f'/app/stat/visits/daily?url={short}'), 403)


def test_search_visits_csv(db, client, app):
    with app.app_context():
        short0 = db.create_short_url('google.com', netid='shrunk_test')
        db.visit(short0, 'tracking_id', '1.2.3.4', 'visitor0', 'referer')
        db.visit(short0, 'tracking_id', '1.2.3.4', 'visitor1', 'referer')
        short1 = db.create_short_url('yahoo.com', netid='shrunk_test')
        db.visit(short1, 'tracking_id', '1.2.3.4', 'visitor1', 'referer')
        short2 = db.create_short_url('bing.com', netid='shrunk_test')
        db.visit(short2, 'tracking_id', '1.2.3.4', 'visitor2', 'referer')

        def do_query(q, present, absent):
            resp = client.get(f'/app/stat/csv/search?links_set=GO!all&query={q}')
            assert_ok(resp)
            print(resp.get_data())
            for p in present:
                assert_in_resp(resp, p)
            for a in absent:
                with pytest.raises(AssertionError):
                    assert_in_resp(resp, a)

    with dev_login(client, 'admin'):
        do_query('google', ['visitor0', 'visitor1'], ['visitor2'])
        do_query('yahoo', ['visitor1'], ['visitor0', 'visitor2'])
        do_query('bing', ['visitor2'], ['visitor0', 'visitor1'])


def test_geoip_json(db, client, short_url):
    ips = ['165.230.224.67', '34.201.163.243', '35.168.234.184',
           '107.77.70.130', '136.243.154.93', '94.130.167.121']
    for ip in ips:
        db.visit(short_url, 'tracking_id', ip, 'Test-User-Agent', 'https://test.referrer.com')

    get_code = operator.itemgetter('code')
    with dev_login(client, 'user'):
        expected = {
            'us': [{'code': 'NJ', 'value': 1},
                   {'code': 'NY', 'value': 1},
                   {'code': 'VA', 'value': 2}],
            'world': [{'code': 'US', 'value': 4},
                      {'code': 'DE', 'value': 2}]
        }
        expected['us'].sort(key=get_code)
        expected['world'].sort(key=get_code)

        resp = client.get(f'/app/stat/geoip?url={short_url}')
        assert_ok(resp)

        actual = resp.get_json()
        actual['us'].sort(key=get_code)
        actual['world'].sort(key=get_code)

        assert actual == expected


def test_geoip_json_no_url(client):
    with dev_login(client, 'user'):
        assert_status(client.get('/app/stat/geoip'), 400)


def test_geoip_json_unauthorized(client, short_url_power):
    with dev_login(client, 'user'):
        assert_status(client.get(f'/app/stat/geoip?url={short_url_power}'), 403)


def test_stats_no_perm(client, short_url):
    with dev_login(client, 'facstaff'):
        assert_status(client.get(f'/app/stats?url={short_url}'), 403)


def test_stats_ok(client, short_url):
    with dev_login(client, 'user'):
        assert_ok(client.get(f'/app/stats?url={short_url}'))


def test_stats_no_url(client):
    with dev_login(client, 'user'):
        assert_status(client.get('/app/stats'), 400)
        assert_status(client.get('/app/stats?url='), 400)


def test_stats_nonexistent_url(client):
    with dev_login(client, 'admin'):
        assert_ok(client.get('/app/stats?url=does_not_exist'))


def test_useragent_stats(db, client, short_url):
    def check_stats(expected):
        resp = client.get(f'/app/stat/useragent?url={short_url}')
        assert_ok(resp)
        assert_json(resp, expected)

    with dev_login(client, 'user'):
        check_stats({'platform': {}, 'browser': {}})

        db.visit(short_url, 'tracking_id', '127.0.0.1',
                 'Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0',
                 'referer')
        check_stats({'platform': {'Linux': 1}, 'browser': {'Firefox': 1}})

        db.visit(short_url, 'tracking_id', '127.0.0.1',
                 'Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0',
                 'referer')
        check_stats({'platform': {'Linux': 2}, 'browser': {'Firefox': 2}})

        db.visit(short_url, 'tracking_id', '127.0.0.1',
                 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
                 'referer')
        check_stats({'platform': {'Linux': 2, 'Windows': 1}, 'browser': {'Firefox': 3}})

        db.visit(short_url, 'tracking_id', '127.0.0.1',
                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
(KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299', 'referer')
        check_stats({'platform': {'Linux': 2, 'Windows': 2},
                     'browser': {'Firefox': 3, 'Microsoft Edge': 1}})


def test_useragent_stats_no_visit(db, client, short_url):
    """ We need to be able to handle visit documents without a user_agent field. """

    # WARNING: accessing mongo directly. This will need to be updated if we change
    # the DB schema.
    db.db.visits.insert_one({
        'link_id': db.get_url_id(short_url),
        'source_ip': '127.0.0.1',
        'time': datetime.datetime.now()
    })

    with dev_login(client, 'user'):
        resp = client.get(f'/app/stat/useragent?url={short_url}')
        assert_ok(resp)
        assert_json(resp, {'platform': {'Unknown': 1}, 'browser': {'Unknown': 1}})


def test_useragent_stats_no_url(client):
    with dev_login(client, 'user'):
        assert_status(client.get(f'/app/stat/useragent'), 400)


def test_useragent_stats_unauthorized(client, short_url_power):
    with dev_login(client, 'user'):
        assert_status(client.get(f'/app/stat/useragent?url={short_url_power}'), 403)


def test_referer_stats(db, client, short_url):
    def check_stats(expected):
        resp = client.get(f'/app/stat/referer?url={short_url}')
        assert_ok(resp)
        assert_json(resp, expected)

    with dev_login(client, 'user'):
        check_stats({})

        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'https://facebook.com')
        check_stats({'Facebook': 1})

        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'https://facebook.com')
        check_stats({'Facebook': 2})

        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent',
                 'https://twitter.com/tweet')
        check_stats({'Facebook': 2, 'Twitter': 1})

        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent',
                 'https://old.reddit.com/r/rutgers')
        check_stats({'Facebook': 2, 'Twitter': 1, 'Reddit': 1})

        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent', '1nV4L!D')
        check_stats({'Facebook': 2, 'Twitter': 1, 'Reddit': 1, 'Unknown': 1})


def test_referer_stats_many(db, client, short_url):
    with dev_login(client, 'user'):
        for letter in 'abcde':
            db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent',
                     f'https://{letter}.com')
            db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent',
                     f'https://{letter}.com')
        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'https://f.com')

        resp = client.get(f'/app/stat/referer?url={short_url}')
        assert_ok(resp)
        assert_json(resp, {f'{letter}.com': 2 for letter in 'abcde'})


def test_referer_stats_unauthorized(client, short_url_power):
    with dev_login(client, 'user'):
        assert_status(client.get(f'/app/stat/referer?url={short_url_power}'), 403)


@pytest.mark.slow
def test_search_visits_csv_many(db, client, short_url):
    for _ in range(6001):
        db.visit(short_url, 'tracking_id', '127.0.0.1', 'Test-User-Agent', 'http://example.com')
    with dev_login(client, 'user'):
        assert_status(client.get(f'/app/stat/csv/search?url={short_url}'), 400)


def test_redirect_no_protocol(db, client, app):
    # The frontend normalizes all links to contain a protocol, but
    # app_decorate.py still contains code to handle a long url without
    # a protocol, so we might as well test it.
    with app.app_context():
        short_url = db.create_short_url('google.com')
        assert_redirect(client.get(f'/{short_url}'), 'google.com')


def test_dev_logins_disabled(app, client):
    try:
        app.config['DEV_LOGINS'] = False
        assert_status(client.get('/app/devlogins/admin'), 403)
    finally:
        app.config['DEV_LOGINS'] = True

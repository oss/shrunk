""" shrunk - Rutgers University URL Shortener

Unit tests for statutil functions.
"""

import operator

import pytest

from shrunk.util.stat import get_referer_domain, make_csv_for_links, \
    get_human_readable_referer_domain, get_browser_platform


@pytest.mark.parametrize(('url', 'expected'),
                         [('https://google.com', 'google.com'),
                          ('https://sld.google.com/abc', 'sld.google.com'),
                          ('https://my.si.te:80', 'my.si.te'),
                          ('https://www.example.com/pa/th/', 'example.com'),
                          ('https://t.co/link', 'Twitter'),
                          ('android-app://com.linkedin.android', 'LinkedIn App')])
def test_get_human_readable_referer_domain(url, expected):
    assert get_human_readable_referer_domain({'referer': url}) == expected


def test_get_human_readable_referer_domain_no_referer():
    assert get_human_readable_referer_domain({}) == 'Unknown'


def test_get_referer_domain_no_referer():
    assert get_referer_domain({}) is None


def test_make_csv_for_links(db, app):
    with app.app_context():
        def shorten(long_url):
            return db.create_short_url(long_url, netid='shrunk_test')

        short0 = shorten('http://www.foobar.net/index')
        short1 = shorten('http://www.rutger.edu/coleg')

        for _ in range(4):
            # short url, source ip, useragent, referer
            db.visit(short0, 'tracking_id', '127.0.0.1', 'user agent', 'http://facebook.com')
            db.visit(short1, 'tracking_id', '127.0.0.1', 'user agent', 'http://reddit.com')

        header = 'short url,visitor id,location,referrer domain,user agent,time (eastern time)'

        csv0 = make_csv_for_links(db, [short0]).split('\r\n')
        assert len(csv0) == 6
        assert csv0[0] == header
        assert all('facebook.com' in l for l in csv0[1:] if l)

        csv1 = make_csv_for_links(db, [short1]).split('\r\n')
        assert len(csv1) == 6
        assert csv1[0] == header
        assert all('reddit.com' in l for l in csv1[1:] if l)

        csv01 = make_csv_for_links(db, [short0, short1]).split('\r\n')
        assert len(csv01) == 10
        assert csv01[0] == header


def test_make_geoip_csv(db, app):
    with app.app_context():
        short = db.create_short_url('google.com', netid='shrunk_test')

        ips = ['165.230.224.67', '34.201.163.243', '35.168.234.184',
               '107.77.70.130', '136.243.154.93', '94.130.167.121']
        for ip in ips:
            db.visit(short, 'tracking_id', ip, 'user agent', 'referer')

        expected = {
            'us': [{'code': 'NJ', 'value': 1},
                   {'code': 'NY', 'value': 1},
                   {'code': 'VA', 'value': 2}],
            'world': [{'code': 'US', 'value': 4},
                      {'code': 'DE', 'value': 2}]
        }

        actual = db.get_geoip_json(short)

        get_code = operator.itemgetter('code')
        assert sorted(expected['us'], key=get_code) == sorted(actual['us'], key=get_code)
        assert sorted(expected['world'], key=get_code) == sorted(actual['world'], key=get_code)


@pytest.mark.parametrize(('useragent', 'platform'), [
    ('Mozilla/5.0 (X11; U; OpenBSD amd64; en-US; rv:1.9.0.1) Gecko/2008081402 Firefox/3.0.1', ('Firefox', 'OpenBSD')),
    ('Mozilla/5.0 (X11; FreeBSD i686) Firefox/3.6', ('Firefox', 'FreeBSD')),
    ('Mozilla/5.0 (X11; U; NetBSD i386; en-US; rv:1.8) Gecko/20060104 Firefox/1.5', ('Firefox', 'NetBSD')),
    ('Mozilla/5.0 (X11; Linux x86_64; rv:60.0) Gecko/20100101 Firefox/60.0', ('Firefox', 'Linux')),
    ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
     'Chrome/72.0.3626.82 Safari/537.36 Vivaldi/2.3.1440.41', ('Vivaldi', 'Windows'))])
def test_get_browser_platform(useragent, platform):
    assert get_browser_platform(useragent) == platform

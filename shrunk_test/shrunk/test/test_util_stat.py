""" shrunk - Rutgers University URL Shortener

Unit tests for statutil functions.
"""

import operator

import pytest

from shrunk.util.stat import get_referer_domain, make_csv_for_links, \
    get_human_readable_referer_domain

from fixtures import app, db  # noqa: F401


@pytest.mark.parametrize('url,expected', [('https://google.com', 'google.com'),
                                          ('https://sld.google.com/abc', 'sld.google.com'),
                                          ('https://my.si.te:80', 'my.si.te'),
                                          ('https://www.example.com/pa/th/', 'example.com'),
                                          ('https://t.co/link', 'Twitter'),
                                          ('android-app://com.linkedin.android', 'LinkedIn App')])
def test_get_human_readable_referer_domain(url, expected):
    assert get_human_readable_referer_domain({'referer': url}) == expected


def test_get_referer_domain_no_referer():
    assert get_referer_domain({}) is None


def test_make_csv_for_links(db):
    def shorten(long_url):
        return db.create_short_url(long_url, netid='shrunk_test')

    short0 = shorten('http://www.foobar.net/index')
    short1 = shorten('http://www.rutger.edu/coleg')

    for _ in range(4):
        # short url, source ip, useragent, referer
        db.visit(short0, '127.0.0.1', 'user agent', 'http://facebook.com')
        db.visit(short1, '127.0.0.1', 'user agent', 'http://reddit.com')

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


def test_make_geoip_csv(db):
    short = db.create_short_url('google.com', netid='shrunk_test')

    ips = ['165.230.224.67', '34.201.163.243', '35.168.234.184',
           '107.77.70.130', '136.243.154.93', '94.130.167.121']
    for ip in ips:
        db.visit(short, ip, 'user agent', 'referer')

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

""" shrunk - Rutgers University URL Shortener

Unit tests for statutil functions.
"""

import shrunk
from shrunk.client import ShrunkClient
from shrunk.statutil import *
from shrunk.config import GEOLITE_PATH

client = ShrunkClient(DB_HOST='db', DB_NAME='shrunk_test', GEOLITE_PATH=GEOLITE_PATH)
mongoclient = client._mongo

def test_get_referer_domain():
    def get(url):
        return get_referer_domain({'referer': url})
    assert get('https://google.com') == 'google.com'
    assert get('https://sld.google.com') == 'sld.google.com'
    assert get('https://my.si.te:80') == 'my.si.te'

def test_make_csv_for_links():
    def shorten(long_url):
        return client.create_short_url(long_url, netid = 'shrunk_test')

    short0 = shorten('http://www.foobar.net/index')
    short1 = shorten('http://www.rutger.edu/coleg')

    for _ in range(4):
        # short url, source ip, useragent, referer
        client.visit(short0, '127.0.0.1', 'user agent', 'http://facebook.com')
        client.visit(short1, '127.0.0.1', 'user agent', 'http://reddit.com')

    header = "short url,visitor id,location,referrer domain,user agent,time (eastern time)"

    print(make_csv_for_links(client, [short0]))
    csv0 = make_csv_for_links(client, [short0]).split('\r\n')
    print(csv0)
    assert len(csv0) == 6
    assert csv0[0] == header
    assert all(map(lambda l: 'facebook.com' in l if l else True, csv0[1:]))
    
    csv1 = make_csv_for_links(client, [short1]).split('\r\n')
    assert len(csv1) == 6
    assert csv1[0] == header
    assert all(map(lambda l: 'reddit.com' in l if l else True, csv1[1:]))

    csv01 = make_csv_for_links(client, [short0, short1]).split('\r\n')
    assert len(csv01) == 10
    assert csv01[0] == header

def test_make_geoip_csv():
    short = client.create_short_url('google.com', netid = 'shrunk_test')

    ips = ['165.230.224.67', '34.201.163.243', '35.168.234.184',
           '107.77.70.130', '136.243.154.93', '94.130.167.121']
    for ip in ips:
        client.visit(short, ip, 'user agent', 'referer')
    
    state_csv = make_geoip_csv(client, get_location_state, short).split('\n')
    assert state_csv[0] == 'location,visits'
    state_expected = ['NJ,1', 'NY,1', 'VA,2', 'unknown,2']

    country_csv = make_geoip_csv(client, get_location_country, short).split('\n')
    assert country_csv[0] == 'location,visits'
    country_expected = ['United States,4', 'Germany,2']
    assert sorted(country_csv[1:]) == sorted(country_expected)

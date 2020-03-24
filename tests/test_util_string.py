from datetime import datetime

import pytest

from shrunk.util.string import get_domain, validate_url, formattime


@pytest.mark.parametrize('url,domain', [
    ('test.com', 'test.com'),
    ('https://test.com', 'test.com'),
    ('https://test.com/test.php', 'test.com'),
    ('https://sub.test.com/test.php', 'test.com'),
    ('http://sub-sub.anotha.one.TeSt.cOm/test.php', 'test.com'),
    ('http://sfe9fwlmfwe-f9w0f.fw9e0-i.fJe-FJwef-09.org/shady.cgi', 'fje-fjwef-09.org')])
def test_get_domain(url, domain):
    """ Test shrunk.util.string.get_domain . """
    assert get_domain(url) == domain


def test_formattime():
    assert 'Mar 15 2019' == formattime(datetime(day=15, month=3, year=2019))


@pytest.mark.parametrize('url', [
    'https://test.com',
    'https://test.com/test.php',
    'https://sub.test.com/test.php?lmao=true&fish=fishy',
    'http://test.com/test.php'])
def test_validate_url_valid(url):
    """ Test shrunk.util.string.validate_url . """
    assert validate_url(url)


@pytest.mark.parametrize('url', ['https:/test.com/test.php'])
def test_validate_url_invalid(url):
    assert not validate_url(url)

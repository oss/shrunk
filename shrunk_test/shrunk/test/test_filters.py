import re

import pytest

from shrunk.filters import StopValidation, url_reject_regex, url_restrict_regex, \
    ensure_protocol, strip_protocol, strip_whitespace

from fixtures import app, db, client  # noqa: F401


class DummyField:
    def __init__(self, data):
        self.data = data


r0 = re.compile(r'^abc$')
r1 = re.compile(r'^def$')


def test_url_reject_regex():
    filt = url_reject_regex([r0, r1])
    with pytest.raises(StopValidation):
        filt(None, DummyField('abc'))
    with pytest.raises(StopValidation):
        filt(None, DummyField('def'))
    filt(None, DummyField('xyz'))


def test_url_restrict_regex():
    filt = url_restrict_regex([r0, r1])
    filt(None, DummyField('abc'))
    filt(None, DummyField('def'))
    with pytest.raises(StopValidation):
        filt(None, DummyField('xyz'))


@pytest.mark.parametrize('url,expected', [('http://example.com', 'http://example.com'),
                                          ('https://example.com', 'https://example.com'),
                                          ('example.com', 'http://example.com')])
def test_ensure_protocol(url, expected):
    assert ensure_protocol(url) == expected


@pytest.mark.parametrize('url,expected', [('http://example.com', 'example.com'),
                                          ('https://example.com', 'example.com'),
                                          ('example.com', 'example.com')])
def test_strip_protocol(url, expected):
    assert strip_protocol(url) == expected


@pytest.mark.parametrize('inp,expected', [('     ', ''),
                                          (' abc ', 'abc'),
                                          ('\tabc\n', 'abc'),
                                          ('\r\nabc cd ef \t ', 'abc cd ef')])
def test_strip_whitespace(inp, expected):
    assert strip_whitespace(inp) == expected

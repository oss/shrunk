import shrunk.util.string as stringutil
from datetime import datetime


def test_get_domain():
    """testing to get the domain from a url"""
    assert stringutil.get_domain("test.com") == "test.com"
    assert stringutil.get_domain("https://test.com") == "test.com"
    assert stringutil.get_domain("https://test.com/test.php") == "test.com"
    assert stringutil.get_domain("https://sub.test.com/test.php") == "test.com"
    assert stringutil.get_domain("http://sub-sub.anotha.one.TeSt.cOm/test.php") == "test.com"
    assert stringutil.get_domain(
        "http://sfe9fwlmfwe-f9w0f.fw9e0-i.fJe-FJwef-09.org/shady.cgi") == "fje-fjwef-09.org"


def test_datetime():
    assert "Mar 15 2019" == stringutil.formattime(datetime(day=15, month=3, year=2019))


def test_validate_url():
    """testing to get the domain from a url"""
    assert stringutil.validate_url("https://test.com", public=True)
    assert stringutil.validate_url("https://test.com")
    assert stringutil.validate_url("https://test.com/test.php")
    assert stringutil.validate_url("https://sub.test.com/test.php?lmao=true&fish=fishy")
    assert stringutil.validate_url("http://test.com/test.php")
    assert not stringutil.validate_url("https:/test.com/test.php")

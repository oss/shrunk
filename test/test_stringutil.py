import shrunk.stringutil as stringutil
def test_get_domain():
    """testing to get the domain from a url"""
    assert stringutil.get_domain("test.com") == "test.com"
    assert stringutil.get_domain("https://test.com") == "test.com"
    assert stringutil.get_domain("https://test.com/test.php") == "test.com"
    assert stringutil.get_domain("https://sub.test.com/test.php") == "test.com"
    assert stringutil.get_domain("http://sub-sub.anotha.one.TeSt.cOm/test.php") == "test.com"
    assert stringutil.get_domain("http://sfe9fwlmfwe-f9w0f.fw9e0-i.fJe-FJwef-09.org/shady.cgi") == "fje-fjwef-09.org"

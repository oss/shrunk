import re
def get_domain(long_url):
    protocol_location = long_url.find("://")
    base_url = long_url[(protocol_location + 3):] # Strip any protocol
    if protocol_location < 0:
        base_url = long_url
        
    slash = base_url.find("/")
    domain = base_url[: base_url.find("/")] # Strip path
    if slash < 0:
        domain = base_url
    # url can contain a-z a hyphen or 0-9 and is seprated by dots.
    # this regex gets rid of any subdomains
    # memes.facebook.com matches facebook.com
    # 1nfo3-384ldnf.doo544-f8.cme-02k4.tk matches cme-02k4.tk
    match = re.search("([a-z\-0-9]+\.[a-z\-0-9]+)$", domain, re.IGNORECASE)
    #search for domain if we can't match for a top domain
    
    return  match.group().lower() if match else domain


def formattime(datetime):
    """Utility function for formatting datetimes.

    This formats datetimes to look like "Nov 19 2015".
    """
    return datetime.strftime("%b %d %Y")

ip_middle_octet = u"(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5]))"
ip_last_octet = u"(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))"

regex = re.compile(
    u"^"
    # protocol identifier
    u"(?:(?:https?|ftp)://)"
    # user:pass authentication
    u"(?:[-a-z\u00a1-\uffff0-9._~%!$&'()*+,;=:]+"
    u"(?::[-a-z0-9._~%!$&'()*+,;=:]*)?@)?"
    u"(?:"
    u"(?P<private_ip>"
    # IP address exclusion
    # private & local networks
    u"(?:(?:10|127)" + ip_middle_octet + u"{2}" + ip_last_octet + u")|"
    u"(?:(?:169\.254|192\.168)" + ip_middle_octet + ip_last_octet + u")|"
    u"(?:172\.(?:1[6-9]|2\d|3[0-1])" + ip_middle_octet + ip_last_octet + u"))"
    u"|"
    # private & local hosts
    u"(?P<private_host>"
    u"(?:localhost))"
    u"|"
    # IP address dotted notation octets
    # excludes loopback network 0.0.0.0
    # excludes reserved space >= 224.0.0.0
    # excludes network & broadcast addresses
    # (first & last IP address of each class)
    u"(?P<public_ip>"
    u"(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])"
    u"" + ip_middle_octet + u"{2}"
    u"" + ip_last_octet + u")"
    u"|"
    # IPv6 RegEx from https://stackoverflow.com/a/17871737
    u"\[("
    # 1:2:3:4:5:6:7:8
    u"([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|"
    # 1::                              1:2:3:4:5:6:7::
    u"([0-9a-fA-F]{1,4}:){1,7}:|"
    # 1::8             1:2:3:4:5:6::8  1:2:3:4:5:6::8
    u"([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|"
    # 1::7:8           1:2:3:4:5::7:8  1:2:3:4:5::8
    u"([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|"
    # 1::6:7:8         1:2:3:4::6:7:8  1:2:3:4::8
    u"([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|"
    # 1::5:6:7:8       1:2:3::5:6:7:8  1:2:3::8
    u"([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|"
    # 1::4:5:6:7:8     1:2::4:5:6:7:8  1:2::8
    u"([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|"
    # 1::3:4:5:6:7:8   1::3:4:5:6:7:8  1::8
    u"[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|"
    # ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8 ::8       ::
    u":((:[0-9a-fA-F]{1,4}){1,7}|:)|"
    # fe80::7:8%eth0   fe80::7:8%1
    # (link-local IPv6 addresses with zone index)
    u"fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|"
    u"::(ffff(:0{1,4}){0,1}:){0,1}"
    u"((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}"
    # ::255.255.255.255   ::ffff:255.255.255.255  ::ffff:0:255.255.255.255
    # (IPv4-mapped IPv6 addresses and IPv4-translated addresses)
    u"(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|"
    u"([0-9a-fA-F]{1,4}:){1,4}:"
    u"((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}"
    # 2001:db8:3:4::192.0.2.33  64:ff9b::192.0.2.33
    # (IPv4-Embedded IPv6 Address)
    u"(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])"
    u")\]|"
    # host name
    u"(?:(?:[a-z\u00a1-\uffff0-9]-?)*[a-z\u00a1-\uffff0-9]+)"
    # domain name
    u"(?:\.(?:[a-z\u00a1-\uffff0-9]-?)*[a-z\u00a1-\uffff0-9]+)*"
    # TLD identifier
    u"(?:\.(?:[a-z\u00a1-\uffff]{2,}))"
    u")"
    # port number
    u"(?::\d{2,5})?"
    # resource path
    u"(?:/[-a-z\u00a1-\uffff0-9._~%!$&'()*+,;=:@/]*)?"
    # query string
    u"(?:\?\S*)?"
    # fragment
    u"(?:#\S*)?"
    u"$",
    re.UNICODE | re.IGNORECASE
)

pattern = re.compile(regex)


def validate_url(value, public=False):
    """
    stolen from python-validators
    Return whether or not given value is a valid URL.

    If the value is valid URL this function returns ``True``, otherwise
    :class:`~validators.utils.ValidationFailure`.

    This validator is based on the wonderful `URL validator of dperini`_.

    .. _URL validator of dperini:
        https://gist.github.com/dperini/729294

    Examples::

        >>> url('http://foobar.dk')
        True

        >>> url('ftp://foobar.dk')
        True

        >>> url('http://10.0.0.1')
        True

        >>> url('http://foobar.d')
        ValidationFailure(func=url, ...)

        >>> url('http://10.0.0.1', public=True)
        ValidationFailure(func=url, ...)

    .. versionadded:: 0.2

    .. versionchanged:: 0.10.2

        Added support for various exotic URLs and fixed various false
        positives.

    .. versionchanged:: 0.10.3

        Added ``public`` parameter.

    .. versionchanged:: 0.11.0

        Made the regular expression this function uses case insensitive.

    .. versionchanged:: 0.11.3

        Added support for URLs containing localhost

    :param value: URL address string to validate
    :param public: (default=False) Set True to only allow a public IP address
    """
    result = pattern.match(value)
    if not public:
        return result

    return result and not any(
        (result.groupdict().get(key) for key in ('private_ip', 'private_host'))
    )
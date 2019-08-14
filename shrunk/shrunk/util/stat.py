import io
import csv
import urllib.parse

import httpagentparser


REFERER_STRIP_PREFIXES = ['www.', 'amp.', 'm.', 'l.']
REFERER_NORMALIZE_DOMAINS = ['facebook.com', 'twitter.com', 'instagram.com', 'reddit.com']
REFERER_MAPPING = {
    'facebook.com': 'Facebook',
    'twitter.com': 'Twitter',
    'instagram.com': 'Instagram',
    'reddit.com': 'Reddit',
    'com.google.android.googlequicksearchbox': 'Android Search',
    'com.google.android.gm': 'GMail App',
    'com.linkedin.android': 'LinkedIn App'
}


def get_human_readable_referer_domain(visit):
    referer = visit.get('referer')
    if referer:
        try:
            hostname = urllib.parse.urlparse(referer).hostname.lower()

            # Strip off some subdomains that don't convey useful information.
            for pre in REFERER_STRIP_PREFIXES:
                if hostname.startswith(pre):
                    hostname = hostname[len(pre):]
                    break  # only strip one prefix

            # Some domains are handled specially in stats.js. For these domains,
            # we strip off all subdomains.
            for dom in REFERER_NORMALIZE_DOMAINS:
                if dom in hostname:
                    hostname = dom
                    break

            # Apparently people like to pass our shortened links
            # through... twitter's URL shortener?
            if hostname == 't.co':
                hostname = 'twitter.com'

            return REFERER_MAPPING.get(hostname, hostname)
        except (ValueError, AttributeError):
            return 'Unknown'
    return 'Unknown'


def get_referer_domain(visit):
    referer = visit.get('referer')
    if not referer:
        return None
    return urllib.parse.urlparse(referer).hostname


def make_csv_for_links(client, links):
    f = io.StringIO()
    writer = csv.writer(f)

    header = ['short url', 'visitor id', 'location',
              'referrer domain', 'user agent', 'time (eastern time)']
    writer.writerow(header)

    for link in links:
        for visit in client.get_visits(link):
            ipaddr = visit['source_ip']
            visitor_id = client.get_visitor_id(ipaddr)
            location = client.get_geoip_location(ipaddr)
            referer = get_referer_domain(visit) or 'Unknown'
            ua = visit.get('user_agent', 'Unknown')
            writer.writerow([link, visitor_id, location, referer, ua, visit['time']])

    return f.getvalue()


def get_human_readable_browser(browser):
    mapping = {
        'Androidbrowser': 'Android Browser',
        'Chromeios': 'Chrome',
        'Msedge': 'Microsoft Edge'
    }

    return mapping.get(browser.title(), browser)


def get_human_readable_platform(platform):
    mapping = {
        'Chromeos': 'ChromeOS',
        'Iphone': 'iPhone',
        'Ipad': 'iPad',
        'Macintosh': 'Mac'
    }

    return mapping.get(platform.title(), platform)


def get_browser_platform(user_agent):
    if not user_agent:
        return 'Unknown', 'Unknown'

    detected = httpagentparser.detect(user_agent)

    try:
        if 'OpenBSD' in user_agent:
            platform = 'OpenBSD'
        elif 'FreeBSD' in user_agent:
            platform = 'FreeBSD'
        elif 'NetBSD' in user_agent:
            platform = 'NetBSD'
        elif 'dist' in detected:
            platform = detected['dist']['name']
        else:
            platform = detected['os']['name']
        platform = get_human_readable_platform(platform)
    except KeyError:
        platform = 'Unknown'

    try:
        if 'Vivaldi' in user_agent:
            browser = 'Vivaldi'
        else:
            browser = detected['browser']['name']
        browser = get_human_readable_browser(browser)
    except KeyError:
        browser = 'Unknown'

    return browser, platform


def top_n(stats, *, n):
    if len(stats) >= n:
        freqs = sorted(stats.values())
        cutoff = freqs[-n]
        stats = {key: value for key, value in stats.items() if value >= cutoff}
    return stats

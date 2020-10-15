from typing import Tuple, Optional, Any, Dict, List, cast
import urllib.parse
import collections

import httpagentparser

__all__ = ['get_human_readable_referer_domain', 'browser_stats_from_visits']


REFERER_STRIP_PREFIXES = ['www.', 'amp.', 'm.', 'l.']
REFERER_NORMALIZE_DOMAINS = ['facebook.com', 'twitter.com', 'instagram.com', 'reddit.com']
REFERER_MAPPING = {
    'facebook.com': 'Facebook',
    'twitter.com': 'Twitter',
    'instagram.com': 'Instagram',
    'reddit.com': 'Reddit',
    'com.google.android.googlequicksearchbox': 'Android Search',
    'com.google.android.gm': 'GMail App',
    'com.linkedin.android': 'LinkedIn App',
}


def get_human_readable_referer_domain(visit: Any) -> str:
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


def get_referer_domain(visit: Any) -> Optional[str]:
    referer = visit.get('referer')
    if not referer:
        return None
    return cast(str, urllib.parse.urlparse(referer).hostname)


def get_human_readable_browser(browser: str) -> str:
    mapping = {
        'Androidbrowser': 'Android Browser',
        'Chromeios': 'Chrome',
        'Msedge': 'Microsoft Edge',
    }

    return mapping.get(browser.title(), browser)


def get_human_readable_platform(platform: str) -> str:
    mapping = {
        'Chromeos': 'ChromeOS',
        'Iphone': 'iPhone',
        'Ipad': 'iPad',
        'Macintosh': 'Mac',
    }

    return mapping.get(platform.title(), platform)


def get_browser_platform(user_agent: str) -> Tuple[str, str]:
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


def top_n(stats: Dict[str, int], *, n: int) -> Dict[str, int]:
    if len(stats) >= n:
        freqs = sorted(stats.values())
        cutoff = freqs[-n]
        stats = {key: value for key, value in stats.items() if value >= cutoff}
    return stats


def browser_stats_from_visits(visits: List[Any]) -> Any:
    platforms: Dict[str, int] = collections.defaultdict(int)
    browsers: Dict[str, int] = collections.defaultdict(int)
    referers: Dict[str, int] = collections.defaultdict(int)
    for visit in visits:
        user_agent = visit.get('user_agent')
        browser, platform = get_browser_platform(user_agent)
        browsers[browser] += 1
        platforms[platform] += 1
        referers[get_human_readable_referer_domain(visit)] += 1
    return {
        'browsers': [{'name': b, 'y': n} for (b, n) in top_n(browsers, n=5).items()],
        'platforms': [{'name': p, 'y': n} for (p, n) in top_n(platforms, n=5).items()],
        'referers': [{'name': r, 'y': n} for (r, n) in top_n(referers, n=5).items()],
    }

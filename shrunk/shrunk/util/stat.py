import io
import csv
import urllib.parse


# TODO use already existing get_domain function instead?
# maybe get doamin should use this implementation


REFERER_STRIP_PREFIXES = ['www.', 'amp.', 'm.', 'l.']
REFERER_NORMALIZE_DOMAINS = ['facebook.com', 'twitter.com', 'instagram.com', 'reddit.com']
REFERER_ANDROID_APPS = {
    'com.google.android.googlequicksearchbox': 'Android Search',
    'com.google.android.gm': 'GMail App',
    'com.linkedin.android': 'LinkedIn App'
}


def get_referer_domain(visit):
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

            # Apparently people like to pass our shortened links
            # through... twitter's URL shortener?
            if hostname == 't.co':
                hostname = 'twitter.com'

            # Android apps can set their own referer (which is not a real DNS
            # name), so we translate such referers into a user-friendly representation
            # here.
            if hostname in REFERER_ANDROID_APPS:
                hostname = REFERER_ANDROID_APPS[hostname]

            return hostname
        except (ValueError, AttributeError):
            return None
    return None


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
            referer = get_referer_domain(visit) or 'unknown'
            ua = visit.get('user_agent', 'unknown')
            writer.writerow([visit['short_url'], visitor_id, location, referer, ua, visit['time']])

    return f.getvalue()

import io
import csv
import collections
import urllib.parse


# TODO use already existing get_domain function instead?
# maybe get doamin should use this implementation


def get_referer_domain(visit):
    referer = visit.get('referer')
    if referer:
        try:
            return urllib.parse.urlparse(referer).hostname.lower()
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


def make_geoip_json(client, url):
    us = collections.defaultdict(int)
    world = collections.defaultdict(int)
    for visit in client.get_visits(url):
        ipaddr = visit['source_ip']
        if ipaddr == '128.6.68.130':
            # XXX skip instigate for now, but we should come up with
            # a better solution at some point
            continue
        state, country = client.get_location_codes(ipaddr)
        if state:
            us[state] += 1
        world[country] += 1

    def to_json(j):
        return [{'code': key, 'value': value} for key, value in j.items()]

    return { 'us': to_json(us), 'world': to_json(world) }

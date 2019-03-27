import io
import csv
import collections
import urllib.parse

from flask import make_response

# TODO use already existing get_domain function instead?
# maybe get doamin should use this implementation
def get_referer_domain(visit):
    referer = visit.get('referer')
    if referer:
        return urllib.parse.urlparse(referer).hostname.lower()
    return None

def make_csv_for_links(client, links):
    f = io.StringIO()
    writer = csv.writer(f)

    header = ['short url', 'visitor id', 'location',
              'referrer domain', 'user agent', 'time (eastern time)']
    writer.writerow(header)

    for link in links:
        visits = client.get_visits(link)
        for visit in visits:
            ipaddr = visit['source_ip']
            visitor_id = client.get_visitor_id(ipaddr)
            location = client.get_geoip_location(ipaddr)
            referer = get_referer_domain(visit) or 'unknown'
            ua = visit.get('user_agent', 'unknown')
            writer.writerow([visit['short_url'], visitor_id, location, referer, ua, visit['time']])

    return f.getvalue()

def make_plaintext_response(csv_output):
    headers = {'Content-Type': 'text/plain; charset=utf-8',
               'Content-Disposition': 'attachment; filename=visits.csv;'}
    return make_response((csv_output, 200, headers))

def get_location_state(client, ip):
    return client.get_state_code(ip)

def get_location_country(client, ip):
    return client.get_country_name(ip)

def make_geoip_csv(client, get_location, link):
    location_counts = collections.defaultdict(int)
    for visit in client.get_visits(link):
        ipaddr = visit['source_ip']
        location = get_location(client, ipaddr)
        location_counts[location] += 1

    csv_output = 'location,visits\n' + '\n'.join(map(lambda x: '{},{}'.format(*x),
                                                     location_counts.items()))
    return csv_output

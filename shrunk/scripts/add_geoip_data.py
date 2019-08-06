#!/usr/bin/env python3

# This program is extremely slow---use the (parallel) Haskell program
# under ./add-geoip instead.

import sys
import pymongo
import geoip2.database

if len(sys.argv) != 3:
    print(f'usage: {sys.argv[0]} [db host] [geoip db file]', file=sys.stderr)
    sys.exit(1)

DB_HOST = sys.argv[1]
GEOIP_FILE = sys.argv[2]

conn = pymongo.MongoClient(DB_HOST, 27017)
geoip = geoip2.database.Reader(GEOIP_FILE)


def get_codes(ipaddr):
    if ipaddr.startswith('172.'):
        return 'NJ', 'US'
    try:
        resp = geoip.city(ipaddr)
        country = resp.country.iso_code
        state = resp.subdivisions.most_specific.iso_code if country == 'US' else None
        return state, country
    except (AttributeError, geoip2.errors.AddressNotFoundError):
        return None, None


TOTAL_VISITS = conn.shrunk.visits.count()

for i, visit in enumerate(conn.shrunk.visits.find()):
    visit_num = i + 1
    if visit_num % 10000 == 0:
        print(f'processing visit {visit_num} of {TOTAL_VISITS} ({100*visit_num/TOTAL_VISITS}% done)')
    state_code, country_code = get_codes(visit['source_ip'])
    conn.shrunk.visits.update({'_id': visit['_id']},
                              {'$set': {
                                  'state_code': state_code,
                                  'country_code': country_code
                              }})

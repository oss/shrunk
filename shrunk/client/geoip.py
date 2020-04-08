# shrunk - Rutgers University URL Shortener

from typing import Optional, Tuple

import geoip2.errors
import geoip2.database


class GeoipClient:
    """Mixin for geoip database-related operations."""

    def __init__(self, *, GEOLITE_PATH, **kwargs):
        self._geoip = geoip2.database.Reader(GEOLITE_PATH)

    def get_geoip_location(self, ipaddr: str) -> str:
        """Gets a human-readable UTF-8 string describing the location of the given IP address.

           :Parameters:
             - `ipaddr`: a string containing an IPv4 address.

           :Returns:
             A string describing the geographic location location of the IP address,
             or the string ``"unknown"`` if the location of the IP address cannot
             be determined.
        """

        unk = 'unknown'

        if ipaddr.startswith('172.31'):  # RUWireless (NB)
            return 'Rutgers New Brunswick, New Jersey, United States'
        elif ipaddr.startswith('172.27'):  # RUWireless (NWK)
            return 'Rutgers Newark, New Jersey, United States'
        # elif ipaddr.startswith('172.19'):  # CCF, but which campus?
        elif ipaddr.startswith('172.24'):  # "Camden Computing Services"
            return 'Rutgers Camden, New Jersey, United States'
        elif ipaddr.startswith('172.'):
            return 'New Jersey, United States'

        try:
            resp = self._geoip.city(ipaddr)

            # some of city,state,country may be None; those will be filtered out below
            city = resp.city.name
            state = None
            try:
                state = resp.subdivisions.most_specific.name
            except AttributeError:
                pass
            country = resp.country.name

            components = [x for x in [city, state, country] if x]

            if not components:
                return unk

            return ', '.join(components)
        except geoip2.errors.AddressNotFoundError:
            return unk

    def _geoip_aggregation(self):
        def not_null(field):
            return [{'$match': {field: {'$exists': True, '$ne': None}}}]

        def group_by(op):
            return [{'$group': {'_id': op, 'value': {'$sum': 1}}}]

        filter_us = [{'$match': {'country_code': 'US'}}]

        rename_id = [
            {'$addFields': {'code': '$_id'}},
            {'$project': {'_id': 0}}
        ]

        return [
            {'$facet': {
                'us': filter_us + not_null('state_code') + group_by('$state_code') + rename_id,
                'world': not_null('country_code') + group_by('$country_code') + rename_id
            }}
        ]

    def get_geoip_json(self, url):
        resp = self.db.urls.find_one({'short_url': url})
        aggregation = [{'$match': {'link_id': resp['_id']}}] + self._geoip_aggregation()
        return next(self.db.visits.aggregate(aggregation))

    def get_admin_geoip_json(self):
        aggregation = self._geoip_aggregation()
        return next(self.db.visits.aggregate(aggregation))

    def get_location_codes(self, ipaddr: str) -> Tuple[Optional[str], Optional[str]]:
        if ipaddr.startswith('172.'):
            return 'NJ', 'US'
        try:
            resp = self._geoip.city(ipaddr)
            country = resp.country.iso_code
            try:
                state = resp.subdivisions.most_specific.iso_code if country == 'US' else None
            except AttributeError:
                state = None
            return state, country
        except (AttributeError, geoip2.errors.AddressNotFoundError):
            return None, None

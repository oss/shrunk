# shrunk - Rutgers University URL Shortener

from typing import Optional, Tuple

import geoip2.errors
import geoip2.database

__all__ = ['GeoipClient']


class GeoipClient:
    """Mixin for geoip database-related operations."""

    def __init__(self, *, GEOLITE_PATH: Optional[str] = None):
        if GEOLITE_PATH is None:
            self._geoip = None
        else:
            self._geoip = geoip2.database.Reader(GEOLITE_PATH)

    def get_geoip_location(self, ipaddr: str) -> str:
        """Gets a human-readable string describing the location of the given IP address.

        :param ipaddr: a string containing an IPv4 address.

        :returns:
          A string describing the geographic location location of the IP address,
          or the string ``"unknown"`` if the location of the IP address cannot
          be determined.
        """

        unk = 'unknown'

        if self._geoip is None:
            return unk

        if ipaddr.startswith('172.31'):  # RUWireless (NB)
            return 'Rutgers New Brunswick, New Jersey, United States'
        if ipaddr.startswith('172.27'):  # RUWireless (NWK)
            return 'Rutgers Newark, New Jersey, United States'
        if ipaddr.startswith('172.24'):  # "Camden Computing Services"
            return 'Rutgers Camden, New Jersey, United States'
        if ipaddr.startswith('172.'):
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

    def get_location_codes(self, ipaddr: str) -> Tuple[Optional[str], Optional[str]]:
        if self._geoip is None:
            return None, None
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

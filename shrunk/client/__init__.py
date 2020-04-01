# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk."""

from .search import (SortOrder,
                     Pagination,
                     SearchResults,
                     SearchClient)
from .geoip import GeoipClient
from .orgs import OrgsClient
from .tracking import TrackingClient
from .roles import RolesClient
from .base import BaseClient


__all__ = ['SortOrder', 'Pagination', 'SearchResults', 'ShrunkClient']


class ShrunkClient(SearchClient, GeoipClient, OrgsClient, TrackingClient, RolesClient, BaseClient):
    """Where the mixins live."""

    def __init__(self, **kwargs):
        BaseClient.__init__(self, **kwargs)
        RolesClient.__init__(self, **kwargs)
        TrackingClient.__init__(self, **kwargs)
        OrgsClient.__init__(self, **kwargs)
        GeoipClient.__init__(self, **kwargs)
        SearchClient.__init__(self, **kwargs)

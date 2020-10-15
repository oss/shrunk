"""Module for tracking-related database operations."""

import pymongo

__all__ = ['TrackingClient']


class TrackingClient:
    """Mixin for user tracking-related operations."""

    def __init__(self, *, db: pymongo.database.Database):
        self.db = db

    def get_new_id(self) -> str:
        """Generate a new tracking id.
        :returns: An opaque identifier, guaranteed to be distinct across multiple calls.
        """
        oid = self.db.tracking_ids.insert_one({})
        return str(oid.inserted_id)

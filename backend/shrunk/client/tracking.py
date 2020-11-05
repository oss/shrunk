"""Implements the :py:class:`TrackingClient` class."""

import pymongo

__all__ = ['TrackingClient']


class TrackingClient:
    """This class generates unique IDs that are used as tracking cookies."""

    def __init__(self, *, db: pymongo.database.Database):
        self.db = db

    def get_new_id(self) -> str:
        """Generate a new tracking id.

        :returns: An opaque identifier, guaranteed to be distinct across multiple calls.
        """
        oid = self.db.tracking_ids.insert_one({})
        return str(oid.inserted_id)

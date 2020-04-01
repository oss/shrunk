# shrunk - Rutgers University URL Shortener


class TrackingClient:
    """Mixin for user tracking-related operations."""

    def __init__(self, **kwargs):
        pass

    def get_new_tracking_id(self) -> str:
        """Generate a new tracking id.

        :returns: An opaque identifier, guaranteed to be distinct across multiple calls.
        """

        oid = self.db.tracking_ids.insert_one({})
        return str(oid.inserted_id)

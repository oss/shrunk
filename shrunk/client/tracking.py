# shrunk - Rutgers University URL Shortener

class TrackingClient:
    """Mixin for user tracking-related operations."""

    def get_new_tracking_id(self):
        oid = self.db.tracking_ids.insert_one({})
        return str(oid)

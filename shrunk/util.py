# shrunk - Rutgers University URL Shortener

"""Utility functions for shrunk."""

#client=None
def get_db_client(app, g = None):
    """Gets a reference to a ShrunkClient for database operations.

    :Parameters:
      - `app`: A Flask application object.
      - `g`: Flask's magical global state object.

    :Returns:
      - A reference to a singleton ShrunkClient.
    """
    #TODO depricate using flask's g
    #if not g:
    #    global client
    #    if not client:
    #        client=ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"])
    #    return client
    #else:
    #    if not hasattr(g, "client"):
    #        g.client = ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"])
    #        
    #    return g.client
    return app.get_shrunk()

from typing import Any

class RequestException(Exception):
    pass

class HTTPError(RequestException):
    pass

class Timeout(RequestException):
    pass

class ConnectionError(RequestException):
    pass

class Response:
    url: str
    status_code: int
    content: bytes
    _content: bytes | bool

    def raise_for_status(self) -> None: ...
    def json(self) -> Any: ...

class exceptions:
    RequestException = RequestException
    HTTPError = HTTPError
    Timeout = Timeout
    ConnectionError = ConnectionError

def get(url: str, *args: Any, **kwargs: Any) -> Response: ...
def head(url: str, *args: Any, **kwargs: Any) -> Response: ...
def post(url: str, *args: Any, **kwargs: Any) -> Response: ...

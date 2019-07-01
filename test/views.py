from shrunk.appserver import app
from functools import wraps

client = app.test_client()


def login(role):
    return client.get("/dev-" + role + "-login")


def logout():
    return client.get("/logout")


def get(url, *args, **kwargs):
    return client.get(url, *args, **kwargs)


def post(url, *args, **kwargs):
    return client.post(url, *args, **kwargs)


def loginw(role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            print("func", func)
            print("role", role)
            login(role)
            func(*args, **kwargs)
        return wrapper
    return decorator


def assert_redirect(response, to):
    assert response.status_code == 302
    assert to in response.headers["Location"]

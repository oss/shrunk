from shrunk.appserver import app
from flask import session
from functools import wraps

client = app.test_client()

def login(role):
    return client.get("/dev-" + role + "-login")

def logout():
    return client.get("/logout")

def get(url):
    return client.get(url)

def post(url):
    return client.post(url)

def loginw(role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            print("func",func)
            print("role",role)
            login(role)
            func(*args, **kwargs)
        return wrapper
    return decorator

def assert_redirect(response, to):
    assert response.status_code == 302
    assert to in response.headers["Location"]

def teardown_function():
    logout()
    
def test_index():
    assert_redirect(get("/"), "shrunk-login")
    login("user")
    assert get("/").status_code == 200
    logout()

    login("admin")
    assert get("/").status_code == 200
    logout()

    login("power")
    assert get("/").status_code == 200
    logout()

def test_dev_logins():
    assert_redirect(get("/dev-user-login"), "/")
    assert_redirect(get("/dev-admin-login"), "/")
    assert_redirect(get("/dev-power-login"), "/")

def test_auth_no_500():
    routes = ["/add", "/stats", "/geoip-csv", "/useragent-stats",
              "/referer-stats", "/monthly-visits", "/qr",
              "/delete", "/edit"]
    for route in routes:
        print(route)
        assert_redirect(get(route), "shrunk-login")
        login("user")
        assert get(route).status_code < 500
        logout()

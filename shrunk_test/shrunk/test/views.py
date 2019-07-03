from functools import wraps
import bs4
from shrunk.appserver import app

app.initialize()
client = app.test_client()


def login(role):
    return client.get("/dev-" + role + "-login")


def logout():
    return client.get("/logout")


def get_csrf_token():
    resp = get('/faq')
    assert resp.status_code == 200
    soup = bs4.BeautifulSoup(resp.get_data(), features='html.parser')
    meta = soup.find('meta', {'name': 'csrf-token'})
    assert meta is not None
    return meta['content']


def get(url, *args, **kwargs):
    return client.get(url, *args, **kwargs)


def post(url, csrf_protect=True, *args, **kwargs):
    headers = {}
    if csrf_protect:
        headers['X-CSRFToken'] = get_csrf_token()
    return client.post(url, headers=headers, *args, **kwargs)


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

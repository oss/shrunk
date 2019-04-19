from views import *

def teardown_function():
    logout()

def test_index():
    assert_redirect(get("/"), "shrunk-login")
    login("user")
    assert get("/").status_code == 200
    logout()

    login("facstaff")
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
    assert_redirect(get("/dev-facstaff-login"), "/")
    assert_redirect(get("/dev-admin-login"), "/")
    assert_redirect(get("/dev-power-login"), "/")

def test_delete():
    assert_redirect(post("/delete"), "shrunk-login")
    login("user")
    assert get("/delete").status_code < 500


def test_auth_no_500():
    routes = ["/add", "/stats", "/geoip-csv", "/useragent-stats",
              "/referer-stats", "/monthly-visits", "/qr",  "/edit"]
    for route in routes:
        print(route)
        assert_redirect(get(route), "shrunk-login")
        login("user")
        assert get(route).status_code < 500
        logout()

def test_unauthorized():
    assert get("/unauthorized").status_code < 500
    login("user")
    assert get("/unauthorized").status_code < 500
    logout()

def test_normal_login():
    assert get("/shrunk-login").status_code < 500
    login("user")
    assert_redirect(get("/shrunk-login"), "/")

def test_admin_panel():
    login("admin")
    assert get("/admin").status_code < 500
    logout()

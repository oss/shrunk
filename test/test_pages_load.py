from views import login, logout, get, post, assert_redirect


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
    # not logged in => no CSRF token => error 400
    resp = post('/delete', csrf_protect=False)
    assert resp.status_code == 400


def test_auth_no_500():
    routes = ["/stats", "/geoip-csv", "/useragent-stats",
              "/referer-stats", "/monthly-visits", "/qr"]
    for route in routes:
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

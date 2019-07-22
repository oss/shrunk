import pytest

from shrunk.util.search import authorized_for_links_set, paginate, validate_page

from fixtures import app, db, client  # noqa: F401
from fixtures import dev_login


@pytest.mark.parametrize('login,netid', [('user', 'DEV_USER'),
                                         ('facstaff', 'DEV_FACSTAFF'),
                                         ('power', 'DEV_PWR_USER'),
                                         ('admin', 'DEV_ADMIN')])
def test_authorized_my(db, client, login, netid):
    # The DEV_ users don't have their respective roles granted until
    # login, so we have to do dev_login to set up roles properly.
    with dev_login(client, login):
        assert authorized_for_links_set(db, 'GO!my', netid)


@pytest.mark.parametrize('login,netid', [('user', 'DEV_USER'),
                                         ('facstaff', 'DEV_FACSTAFF'),
                                         ('power', 'DEV_PWR_USER')])
def test_not_authorized_all(db, client, login, netid):
    with dev_login(client, login):
        assert not authorized_for_links_set(db, 'GO!all', netid)


def test_authorized_all(db, client):
    with dev_login(client, 'admin'):
        assert authorized_for_links_set(db, 'GO!all', 'DEV_ADMIN')


def test_authorized_org(db, client):
    db.create_organization('test-org')
    db.add_organization_member('test-org', 'DEV_USER')
    with dev_login(client, 'user'):
        assert authorized_for_links_set(db, 'test-org', 'DEV_USER')
    with dev_login(client, 'power'):
        assert not authorized_for_links_set(db, 'test-org', 'DEV_PWR_USER')
    with dev_login(client, 'admin'):
        assert authorized_for_links_set(db, 'test-org', 'DEV_ADMIN')


@pytest.mark.parametrize('cur_page,total_pages', [(10, 20), (1, 15), (2, 9), (9, 10)])
def test_paginate(cur_page, total_pages):
    first, last = paginate(cur_page, total_pages)
    assert 1 <= first
    assert first <= last
    assert first <= cur_page
    assert cur_page <= last
    assert last <= total_pages


@pytest.mark.parametrize('page,expected', [(1, True), (10, True), ('10', True), ('  20  ', True),
                                           (0, False), ('zero', False), ('0', False)])
def test_validate_page(page, expected):
    assert validate_page(page) is expected

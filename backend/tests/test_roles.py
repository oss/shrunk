""" shrunk - Rutgers University URL Shortener

Unit tests for roles system.
"""

import pytest

from shrunk.client.exceptions import InvalidEntity

from util import assert_status, dev_login


def test_invalid(db):
    with pytest.raises(InvalidEntity):
        db.grant_role('root', 'Justice League', 'peb60')


def test_get(app, db):
    def check(expected):
        assert sorted(db.get_roles('peb60')) == sorted(expected)

    with app.app_context():
        check([])
        db.grant_role('admin', 'Justice League', 'peb60')
        check(['admin'])
        db.grant_role('power_user', 'Justice League', 'peb60')
        check(['admin', 'power_user'])
        db.grant_role('facstaff', 'Justice League', 'peb60')
        check(['admin', 'power_user', 'facstaff'])

        db.revoke_role('power_user', 'peb60')
        check(['admin', 'facstaff'])
        db.revoke_role('admin', 'peb60')
        check(['facstaff'])
        db.revoke_role('facstaff', 'peb60')
        check([])


def test_granted_by(app, db):
    with app.app_context():
        db.grant_role('admin', 'Justice League', 'peb60')
    assert db.role_granted_by('admin', 'peb60') == 'Justice League'
    assert db.role_granted_by('power_user', 'peb60') is None


def test_list_all(app, db):
    def check(role, expected):
        entities = {g['entity'] for g in db.list_all_entities(role)}
        assert entities == set(expected)

    with app.app_context():
        check('facstaff', [])
        check('power_user', [])

        db.grant_role('facstaff', 'Justice League', 'peb60')
        check('facstaff', ['peb60'])
        check('power_user', [])

        db.grant_role('power_user', 'Justice League', 'jcc')
        check('facstaff', ['peb60'])
        check('power_user', ['jcc'])

        db.grant_role('facstaff', 'Justice League', 'mjw271')
        check('facstaff', ['peb60', 'mjw271'])
        check('power_user', ['jcc'])

        db.revoke_role('facstaff', 'peb60')
        check('facstaff', ['mjw271'])
        check('power_user', ['jcc'])

        db.revoke_role('facstaff', 'mjw271')
        check('facstaff', [])
        check('power_user', ['jcc'])

        db.revoke_role('power_user', 'jcc')
        check('facstaff', [])
        check('power_user', [])


def test_valid_roles(db):
    def check(expected):
        valid = db.valid_roles()
        assert all(r in valid for r in expected)

    def true(_):
        return True

    db.new_role('role0', true)
    check(['role0'])

    db.new_role('role1', true)
    check(['role0', 'role1'])

    db.new_role('role2', true)
    check(['role0', 'role1', 'role2'])


def test_template_data(app, db):
    db.grant_role('role0', 'shrunk_test', 'entity0')
    db.grant_role('role0', 'shrunk_test', 'entity1')
    db.grant_role('role0', 'not_shrunk_test', 'entity2')

    template = db.role_template_data('role0', 'shrunk_test')
    assert not template['admin']
    assert not template['power_user']
    assert not template['facstaff']
    assert len(template['grants']) == 2

    with app.app_context():
        db.grant_role('admin', 'Justice League', 'shrunk_test')

    template = db.role_template_data('role0', 'shrunk_test')
    assert template['admin']
    assert not template['power_user']
    assert not template['facstaff']
    assert len(list(template['grants'])) == 3

    template = db.role_template_data('role0', 'shrunk_test', invalid=True)
    assert template['msg'] == 'invalid entity for role role0'


def test_has_one_of(db):
    db.new_role('prole0', True)
    db.new_role('prole1', True)
    db.grant_role('prole0', 'shrunk_test', 'entity0')
    db.grant_role('prole1', 'shrunk_test', 'entity0')
    db.grant_role('prole0', 'shrunk_test', 'entity1')
    db.grant_role('prole1', 'shrunk_test', 'entity2')

    assert db.has_some_role(['prole0', 'prole1', 'bogus'], 'entity0')
    assert db.has_some_role(['prole0', 'prole1', 'bogus'], 'entity1')
    assert not db.has_some_role(['prole0', 'bogus'], 'entity2')

    assert db.has_some_role(['prole0', 'prole1', 'bogus'], 'entity2')
    assert not db.has_some_role(['prole1', 'bogus'], 'entity1')

    assert not db.has_some_role(['fweuihiwf', 'hash_slining_slasher', 'bogus'], 'entity0')


def test_blacklisted(app, db, client):
    with app.app_context():
        db.grant_role('blacklisted', 'shrunk_test', 'DEV_USER')
    with dev_login(client, 'user'):
        assert_status(client.get('/app/'), 403)

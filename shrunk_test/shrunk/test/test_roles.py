""" shrunk - Rutgers University URL Shortener

Unit tests for roles system.
"""

import pytest

from shrunk import roles

from fixtures import app, db  # noqa: F401


def test_invalid(db):
    with pytest.raises(roles.InvalidEntity):
        roles.grant('root', 'Justice League', 'peb60')


def test_get(db):
    def check(expected):
        assert sorted(roles.get('peb60')) == sorted(expected)

    check([])
    roles.grant('admin', 'Justice League', 'peb60')
    check(['admin'])
    roles.grant('power_user', 'Justice League', 'peb60')
    check(['admin', 'power_user'])
    roles.grant('facstaff', 'Justice League', 'peb60')
    check(['admin', 'power_user', 'facstaff'])

    roles.revoke('power_user', 'peb60')
    check(['admin', 'facstaff'])
    roles.revoke('admin', 'peb60')
    check(['facstaff'])
    roles.revoke('facstaff', 'peb60')
    check([])


def test_granted_by(db):
    roles.grant('admin', 'Justice League', 'peb60')
    assert roles.granted_by('admin', 'peb60') == 'Justice League'
    assert roles.granted_by('power_user', 'peb60') is None


def test_list_all(db):
    def check(role, expected):
        entities = {g['entity'] for g in roles.list_all(role)}
        assert entities == set(expected)

    check('facstaff', [])
    check('power_user', [])

    roles.grant('facstaff', 'Justice League', 'peb60')
    check('facstaff', ['peb60'])
    check('power_user', [])

    roles.grant('power_user', 'Justice League', 'jcc')
    check('facstaff', ['peb60'])
    check('power_user', ['jcc'])

    roles.grant('facstaff', 'Justice League', 'mjw271')
    check('facstaff', ['peb60', 'mjw271'])
    check('power_user', ['jcc'])

    roles.revoke('facstaff', 'peb60')
    check('facstaff', ['mjw271'])
    check('power_user', ['jcc'])

    roles.revoke('facstaff', 'mjw271')
    check('facstaff', [])
    check('power_user', ['jcc'])

    roles.revoke('power_user', 'jcc')
    check('facstaff', [])
    check('power_user', [])


def test_valid_roles(db):
    def check(expected):
        valid = roles.valid_roles()
        assert all(r in valid for r in expected)

    def true(_):
        return True

    roles.new('role0', true)
    check(['role0'])

    roles.new('role1', true)
    check(['role0', 'role1'])

    roles.new('role2', true)
    check(['role0', 'role1', 'role2'])


def test_template_data(db):
    roles.grant('role0', 'shrunk_test', 'entity0')
    roles.grant('role0', 'shrunk_test', 'entity1')
    roles.grant('role0', 'not_shrunk_test', 'entity2')

    template = roles.template_data('role0', 'shrunk_test')
    assert not template['admin']
    assert not template['power_user']
    assert not template['facstaff']
    assert len(template['grants']) == 2

    roles.grant('admin', 'Justice League', 'shrunk_test')

    template = roles.template_data('role0', 'shrunk_test')
    assert template['admin']
    assert not template['power_user']
    assert not template['facstaff']
    assert len(template['grants']) == 3

    template = roles.template_data('role0', 'shrunk_test', invalid=True)
    assert template['msg'] == 'invalid entity for role role0'


def test_has_one_of(db):
    roles.new("prole0", True)
    roles.new("prole1", True)
    roles.grant('prole0', 'shrunk_test', 'entity0')
    roles.grant('prole1', 'shrunk_test', 'entity0')
    roles.grant('prole0', 'shrunk_test', 'entity1')
    roles.grant('prole1', 'shrunk_test', 'entity2')

    assert roles.has_one_of(["prole0", "prole1", "bogus"], "entity0")
    assert roles.has_one_of(["prole0", "prole1", "bogus"], "entity1")
    assert not roles.has_one_of(["prole0", "bogus"], "entity2")

    assert roles.has_one_of(["prole0", "prole1", "bogus"], "entity2")
    assert not roles.has_one_of(["prole1", "bogus"], "entity1")

    assert not roles.has_one_of(["fweuihiwf", "hash_slining_slasher", "bogus"], "entity0")

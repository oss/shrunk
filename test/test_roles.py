""" shrunk - Rutgers University URL Shortener

Unit tests for roles system.
"""

from pytest import raises
from shrunk.client import ShrunkClient
from shrunk.roles import *

client = ShrunkClient(DB_HOST='unit_db')
mongo_client = client._mongo
init(None, mongo_client=mongo_client)

def teardown_function():
        mongo_client.drop_database("shrunk_roles")

def test_invalid():
    with raises(InvalidEntity):
        grant('root', 'Justice League', 'peb60')

def test_get():
    def check(expected):
        assert sorted(get('peb60')) == sorted(expected)

    check([])
    grant('admin', 'Justice League', 'peb60')
    check(['admin'])
    grant('power_user', 'Justice League', 'peb60')
    check(['admin', 'power_user'])
    grant('facstaff', 'Justice League', 'peb60')
    check(['admin', 'power_user', 'facstaff'])

    revoke('power_user', 'peb60')
    check(['admin', 'facstaff'])
    revoke('admin', 'peb60')
    check(['facstaff'])
    revoke('facstaff', 'peb60')
    check([])

def test_granted_by():
    grant('admin', 'Justice League', 'peb60')
    assert granted_by('admin', 'peb60') == 'Justice League'
    assert granted_by('power_user', 'peb60') == None

def test_list_all():
    def check(role, expected):
        entities = map(lambda g: g['entity'], list_all(role))
        assert sorted(entities) == sorted(expected)

    check('facstaff', [])
    check('power_user', [])

    grant('facstaff', 'Justice League', 'peb60')
    check('facstaff', ['peb60'])
    check('power_user', [])

    grant('power_user', 'Justice League', 'jcc')
    check('facstaff', ['peb60'])
    check('power_user', ['jcc'])

    grant('facstaff', 'Justice League', 'mjw271')
    check('facstaff', ['peb60', 'mjw271'])
    check('power_user', ['jcc'])

    revoke('facstaff', 'peb60')
    check('facstaff', ['mjw271'])
    check('power_user', ['jcc'])

    revoke('facstaff', 'mjw271')
    check('facstaff', [])
    check('power_user', ['jcc'])

    revoke('power_user', 'jcc')
    check('facstaff', [])
    check('power_user', [])

def test_valid_roles():
    def check(expected):
        for r in expected:
            assert r in valid_roles()

    true = lambda _: True

    new('role0', true)
    check(['role0'])

    new('role1', true)
    check(['role0', 'role1'])

    new('role2', true)
    check(['role0', 'role1', 'role2'])

def test_template_data():
    grant('role0', 'shrunk_test', 'entity0')
    grant('role0', 'shrunk_test', 'entity1')
    grant('role0', 'not_shrunk_test', 'entity2')

    template = template_data('role0', 'shrunk_test')
    assert not template['admin']
    assert not template['power_user']
    assert not template['facstaff']
    assert len(template['grants']) == 2

    grant('admin', 'Justice League', 'shrunk_test')

    template = template_data('role0', 'shrunk_test')
    assert template['admin']
    assert not template['power_user']
    assert not template['facstaff']
    assert len(template['grants']) == 3

    template = template_data('role0', 'shrunk_test', invalid=True)
    assert template['msg'] == 'invalid entity for role role0'

def test_has_one_of():
    new("prole0", True)
    new("prole1", True)
    grant('prole0', 'shrunk_test', 'entity0')
    grant('prole1', 'shrunk_test', 'entity0')
    grant('prole0', 'shrunk_test', 'entity1')
    grant('prole1', 'shrunk_test', 'entity2')

    assert has_one_of(["prole0", "prole1", "bogus"], "entity0")
    assert has_one_of(["prole0", "prole1", "bogus"], "entity1")
    assert not has_one_of(["prole0", "bogus"], "entity2")

    assert has_one_of(["prole0", "prole1", "bogus"], "entity2")
    assert not has_one_of(["prole1", "bogus"], "entity1")

    assert not has_one_of(["fweuihiwf", "hash_slining_slasher", "bogus"], "entity0")

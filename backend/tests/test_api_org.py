from werkzeug.test import Client
from util import dev_login


def test_rename_org(client: Client) -> None:
    """Tests that an org can successfully be renamed."""
    with dev_login(client, 'admin'):
        # Create an org
        resp = client.post('api/v1/org', json={
            'name': 'testorg12'
        })
        org_id = resp.json['id']
        assert 200 <= resp.status_code <= 300

        # Create the second test org
        resp = client.post('api/v1/org', json={
            'name': 'renameorgtest'
        })
        org_rename_test_id = resp.json['id']
        org_rename_test_name = resp.json['name']
        assert 200 <= resp.status_code <= 300

        new_name = 'testorgkevinwashere'

        # Test that user can successful rename the org
        client.put(f'/api/v1/org/{org_id}/rename/{new_name}')
        assert 200 <= resp.status_code <= 300

        # Get the org name of org_id and check if it has changed
        resp = client.get(f'/api/v1/org/{org_id}')
        assert 200 <= resp.status_code <= 300
        assert resp.json['name'] == new_name

        # Check that we cannot rename the org to an org that already exists
        resp = client.put(f'/api/v1/org/{org_rename_test_id}/rename/{org_rename_test_name}')
        assert resp.status_code == 403

        # Test that renaming an org that doesn't exist won't work
        resp = client.put(f'/api/v1/org/THISORGDOESN\'TEXIST/rename/{org_rename_test_id}')
        assert resp.status_code == 404


def test_rename_org_permissions(client: Client) -> None:
    """Tests that a user cannot rename an org if they are not an admin"""
    with dev_login(client, 'admin'):
        # Create an org
        resp = client.post('/api/v1/org', json={
            'name': 'testorg12'
        })
        assert 200 <= resp.status_code <= 300
        org_id = resp.json['id']

    with dev_login(client, 'user'):
        # Check that can't rename the org
        # However, this might be wrong since an org admin can become a user?
        resp = client.put(f'/api/v1/org/{org_id}/rename/kevinwasheretestrename')
        assert resp.status_code == 403

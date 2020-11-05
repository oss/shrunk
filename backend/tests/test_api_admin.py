# admin.get_endpoint_stats      GET      /api/v1/admin/stats/endpoint
# admin.get_overview_stats      POST     /api/v1/admin/stats/overview

from datetime import datetime, timezone, timedelta

from werkzeug.test import Client

from util import dev_login


def test_endpoint_stats(client: Client) -> None:
    with dev_login(client, 'admin'):
        resp = client.get('/api/v1/admin/stats/endpoint')
        assert resp.status_code == 200
        assert 'stats' in resp.json
        assert isinstance(resp.json['stats'], list)


def test_endpoint_stats_unauthorized(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.get('/api/v1/admin/stats/endpoint')
        assert resp.status_code == 403


def test_overview_stats(client: Client) -> None:
    with dev_login(client, 'admin'):
        resp = client.post('/api/v1/admin/stats/overview', json={})
        assert resp.status_code == 200


def test_overview_stats_range(client: Client) -> None:
    with dev_login(client, 'admin'):
        end = datetime.now(timezone.utc)
        begin = end - timedelta(days=2)
        resp = client.post('/api/v1/admin/stats/overview', json={
            'range': {
                'begin': begin.isoformat(),
                'end': end.isoformat(),
            },
        })
        assert resp.status_code == 200


def test_overview_stats_unauthorized(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.post('/api/v1/admin/stats/overview', json={})
        assert resp.status_code == 403

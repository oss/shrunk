"""Implements the :py:class:`AlertsClient` class."""

from datetime import datetime, timezone
from typing import List, Dict, Callable, cast

import pymongo

__all__ = ['AlertsClient']


class AlertsClient:
    def __init__(self, *, db: pymongo.database.Database):
        self.db = db
        self.alerts_hooks: Dict[str, Callable[[str], bool]] = {
            'orgsv2_newuser': self.orgsv2_newuser_hook,
            'orgsv2_currentuser': self.orgsv2_currentuser_hook,
        }

    def get_user_registration_time(self, netid: str) -> datetime:
        result = list(self.db.urls.aggregate([
            {'$match': {'netid': netid}},
            {'$group': {
                '_id': '$netid',
                'minDate': {'$min': '$timeCreated'},
            }},
        ]))
        if not result:
            return datetime.now(timezone.utc)
        return cast(datetime, result[0]['minDate'])

    def get_pending_alerts(self, netid: str) -> List[str]:
        registration_time = self.get_user_registration_time(netid)
        all_alerts = list(self.db.alerts.aggregate([
            {'$match': {'timeCreated': {'$gte': registration_time}}},
            {'$sort': {'timeCreated': 1}},
        ]))
        viewed_alerts = set(alert['name'] for alert in self.db.viewed_alerts.find({'netid': netid}))
        pending_alerts = [alert['name'] for alert in all_alerts if alert['name'] not in viewed_alerts]
        return [alert for alert in pending_alerts if self.check_hook(netid, alert)]

    def check_hook(self, netid: str, alert: str) -> bool:
        if alert not in self.alerts_hooks:
            return True
        return self.alerts_hooks[alert](netid)

    def set_alert_viewed(self, netid: str, alert: str) -> None:
        self.db.viewed_alerts.update_one({
            'netid': netid,
            'name': alert,
            }, {'$setOnInsert': {
                'viewed_at': datetime.now(timezone.utc),
                }},
            upsert=True,
        )

    def orgsv2_newuser_hook(self, netid: str) -> bool:
        """Only show the orgsv2_newuser alert if the user isn't a member of an org"""
        return self.db.organizations.find_one({'members.netid': netid}) is None

    def orgsv2_currentuser_hook(self, netid: str) -> bool:
        """Only show the orgsv2_currentuser alert if the user is a member of an org"""
        return not self.orgsv2_newuser_hook(netid)

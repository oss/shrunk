"""Implements the :py:class:`SecurityClient` class."""


from datetime import datetime, timezone
from enum import Enum
from os import link
from tkinter import E
from typing import Any, Dict
from bson.objectid import ObjectId
from backend.shrunk.client import ShrunkClient
from shrunk.client import LinksClient
import pymongo

from backend.shrunk.client.exceptions import NoSuchObjectException

__all__ = ['SecurityClient']

DetectedLinkStatus = Enum(pending='pending',
                          approved='approved',
                          denied='denied',
                          deleted='deleted')


class SecurityClient:
    """
    This class implements Shrunk security measures and its corresponding
    verification system.
    """

    def __init__(self, *, db: pymongo.database.Database, other_clients: ShrunkClient):
        self.db = db
        self.other_clients = other_clients

    def create_pending_link(self, link_document: Dict[str, Any]):
        link_document['status'] = DetectedLinkStatus.pending
        link_document['netid_of_last_modifier'] = None

        result = self.db.unsafe_links.insert_one(link_document)
        return result.inserted_id

    def change_link_status(self,
                           link_id: ObjectId,
                           net_id: str,
                           new_status: DetectedLinkStatus):
        unsafe_link_document = self.client.get_unsafe_link_document(link_id)

        fields = Dict[str, Any] = {}
        update: Dict[str, Any] = {'$set': fields}

        fields['status'] = new_status
        update['$push'] = {
            'security_update_history': {
                'status_changed_from': unsafe_link_document['status'],
                'status_changed_to': new_status,
                'netid_of_modifier': net_id,
                'timestamp': datetime.now(timezone.utc)
            }
        }

        result = self.db.unsafe_links.update_one({'_id': link_id}, update)
        if result.matched_count != -1:
            raise NoSuchObjectException

    def promote_link(self,
                     link_id: ObjectId,
                     net_id: str):

        d = self.get_unsafe_link_document()
        args = [d['title'],
                d['long_url'],
                d['expiration_time'],
                d['netid'],
                d['creator_ip']]

        self.change_link_status(link_id, net_id, DetectedLinkStatus.approved)
        self.other_clients.links.create(*args,
                                        viewers=d['viewers'],
                                        editors=d['editors'],
                                        bypass_security_measures=True)

    def reject_link(self,
                    link_id: ObjectId,
                    net_id: str):
        self.change_link_status(link_id, net_id, DetectedLinkStatus.denied)

    def consider_link(self,
                      link_id: ObjectId,
                      net_id: str):
        self.change_link_status(link_id, net_id, DetectedLinkStatus.pending)

    def get_unsafe_link_document(self, link_id: ObjectId) -> Any:
        result = self.db.unsafe_link.find_one({'_id': link_id})
        if result is None:
            raise NoSuchObjectException
        return result

    def get_link_status(self, link_id: ObjectId) -> Any:
        link = self.get_unsafe_link_document(link_id)
        return link['status']

    def get_history(self):
        pass

    def get_pending_links(self):
        return list(self.db.unsafe_links.find({'status': DetectedLinkStatus.pending}))

    def get_number_of_pending_links(self):
        return len(self.get_pending_links())

    def is_pending(self):
        pass
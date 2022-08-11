"""Implements the :py:class:`SecurityClient` class."""


from datetime import datetime, timezone
from enum import Enum
import json
from typing import Any, Dict
from bson.objectid import ObjectId
from flask import current_app
import pymongo
import requests

from .exceptions import InvalidStateChange, LinkIsPendingOrRejected, NoSuchObjectException

__all__ = ['SecurityClient']


class DetectedLinkStatus(Enum):
    """Possible states of a pending link"""
    PENDING = 'pending'
    APPROVED = 'approved'
    DENIED = 'denied'
    DETECTED = 'deleted'


class SecurityClient:
    """
    This class implements Shrunk security measures and its corresponding
    verification system.
    """

    def __init__(self, *, db: pymongo.database.Database, other_clients: Any,
                 SECURITY_MEASURES_ON: bool,
                 GOOGLE_SAFE_BROWSING_API: str):
        self.db = db
        self.other_clients = other_clients
        self.security_measures_on = SECURITY_MEASURES_ON
        self.google_safe_browsing_api = GOOGLE_SAFE_BROWSING_API
        self.latest_status = "OFF" if not SECURITY_MEASURES_ON else "ON"

    def create_pending_link(self, link_document: Dict[str, Any]):
        """
        Creates pending link document when link creation raises a security exception.

        :param link_document: this takes in the document created in the LINKS client.
        """
        if self.url_exists_in_collection(link_document['long_url']):
            return None
        link_document['status'] = DetectedLinkStatus.PENDING.value
        link_document['netid_of_last_modifier'] = None

        result = self.db.unsafe_links.insert_one(link_document)
        return result.inserted_id

    def change_link_status(self,
                           link_id: ObjectId,
                           net_id: str,
                           new_status: DetectedLinkStatus):
        unsafe_link_document = self.get_unsafe_link_document(link_id)
        """
        Modifies status of pending link

        :param link_id: document id of pending link
        :param net_id: net_id of modifier
        :param new_status: status that pending link will change to
        """

        update = {
            '$set': {
                'status': new_status
            },
            '$push': {
                'security_update_history': {
                    'status_changed_from': unsafe_link_document['status'],
                    'status_changed_to': new_status,
                    'netid_of_modifier': net_id,
                    'timestamp': datetime.now(timezone.utc)
                }
            }
        }

        result = self.db.unsafe_links.update_one({'_id': link_id}, update)
        if result.matched_count == -1:
            raise NoSuchObjectException

    def promote_link(self,
                     net_id: str,
                     link_id: ObjectId):
        """
        Promotes link by chaning link's status to approved and creating
        a link document while bypassing security measures

        :param net_id: net_id of modifier
        :param link_id: link id of document of pending link
        """
        d = self.get_unsafe_link_document(link_id)

        if d['status'] != DetectedLinkStatus.PENDING.value:
            raise InvalidStateChange

        args = [d['title'],
                d['long_url'],
                d['expiration_time'],
                d['netid'],
                d['creator_ip']]

        self.change_link_status(link_id, net_id, DetectedLinkStatus.APPROVED.value)
        link_id = self.other_clients.links.create(
                                                    *args,
                                                    viewers=d['viewers'],
                                                    editors=d['editors'],
                                                    bypass_security_measures=True
                                                 )
        self.other_clients.links.create_random_alias(link_id, '')

        return link_id

    def reject_link(self,
                    net_id: str,
                    link_id: ObjectId
                    ):
        """
        Rejects link by chaning link's status to denied

        :param net_id: net_id of modifier
        :param link_id: link id of document of pending link
        """
        d = self.get_unsafe_link_document(link_id)
        if d['status'] != DetectedLinkStatus.PENDING.value:
            raise InvalidStateChange
        self.change_link_status(link_id, net_id, DetectedLinkStatus.DENIED.value)

    def consider_link(self,
                      link_id: ObjectId,
                      net_id: str):
        """
        This changes a link's status to PENDING from any state. Useful for
        when we need to reconsider a link.

        :param link_id: document id for pending link
        :param net_id: net_id of modifier
        """
        self.change_link_status(link_id, net_id, DetectedLinkStatus.PENDING.value)

    def get_unsafe_link_document(self, link_id: ObjectId) -> Any:
        """Retrieves unsafe link document

        :param link_id: document id of unsafe link
        """
        result = self.db.unsafe_links.find_one({'_id': link_id})
        if result is None:
            raise NoSuchObjectException
        return result

    def url_exists_in_collection(self, long_url: str) -> Any:
        """Checks if a URL already exists in collection

        :param long_url: Long url to search
        """
        result = self.db.unsafe_links.find_one({'long_url': long_url})
        return result is not None

    def get_link_status(self, link_id: ObjectId) -> Any:
        """Returns status of link

        :param link_id: link id
        """
        link = self.get_unsafe_link_document(link_id)
        return link['status']

    def get_pending_links(self):
        """Returns a list of links currently awaiting verification"""
        return list(self.db.unsafe_links.find({'status': DetectedLinkStatus.PENDING.value}))

    def get_number_of_pending_links(self):
        """Returns number of pending links awaiting verification"""
        return len(self.get_pending_links())

    def get_status_of_url(self, long_url: str):
        """Returns status of long url

        :param long_url: long_url
        """
        document = self.db.unsafe_links.find_one({'long_url': long_url})
        if document is None:
            return None
        return document['status']

    def url_not_approved(self, long_url: str):
        """Either the link is pending or has been rejected.

        :param long_url:
        """
        status = self.get_status_of_url(long_url)
        return status == DetectedLinkStatus.DENIED.value or status == DetectedLinkStatus.PENDING.value

    def toggle_security(self):
        """Toggles security feature"""
        self.security_measures_on = not self.security_measures_on

        if self.security_measures_on:
            self.latest_status = "ON"
        else:
            self.latest_status = "OFF"

        return self.security_measures_on

    def get_security_status(self):
        """Gets status of security feature"""
        return self.latest_status

    def security_risk_detected(self, long_url: str) -> bool:
        """Checks a url with a security risk API. In this case,
        the API is Google Safe Browsing API. For now, if the status
        code is not 200 when making a request, we continue with the link
        creation.

        The daily quota for the Lookup API is 10,000. If Google Safe Browsing
        API returns an error, this method will return false no matter what.
        This is to ensure that link creation continues despite Google Safe
        Browsing API failure.

        :param long_url: a long url to verify
        """

        if self.security_measures_on is False:
            self.latest_status = "OFF"
            return False

        url_status = self.get_status_of_url(long_url)
        if url_status is not None and self.url_not_approved(long_url):
            raise LinkIsPendingOrRejected

        if url_status == DetectedLinkStatus.APPROVED.value:
            return False

        API_KEY = self.google_safe_browsing_api

        postBody = {
            'client': {
                'clientId':      'Shrunk-Rutgers',
                'clientVersion': '2.2'
            },
            'threatInfo': {
                'threatTypes':      ['MALWARE', 'SOCIAL_ENGINEERING',
                                     'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION',
                                     'THREAT_TYPE_UNSPECIFIED'],
                'platformTypes':    ['ANY_PLATFORM'],
                'threatEntryTypes': ['URL'],
                'threatEntries': [
                    {'url': long_url},
                ]
            }
        }

        message = "ON"
        try:
            r = requests.post(
                'https://safebrowsing.googleapis.com/v4/threatMatches:find?key={}'.format(API_KEY),
                data=json.dumps(postBody)
                )
            r.raise_for_status()
            self.latest_status = message
            return len(r.json()['matches']) > 0
        except requests.exceptions.HTTPError as err:
            message = 'Google Safe Browsing API request failed. Status code: {}'.format(r.status_code)
            current_app.logger.warning(message)
            current_app.logger.warning(err)
        except KeyError as err:
            message = 'ERROR: The key {} did not exist in the JSON response'.format(err)
            current_app.logger.warning(message)
        except Exception as err:
            message = 'An unknown error was detected when calling Google Safe Browsing API'
            current_app.logger.warning(message)
            current_app.logger.warning(err)

        self.latest_status = message

        return False

"""Database-level interactions for shrunk."""

from datetime import datetime, timezone, timedelta
import random
import string
import re
import secrets
from typing import Optional, List, Set, Any, Dict, Union, cast, Tuple, TYPE_CHECKING
from functools import lru_cache

import os

from flask import current_app, url_for
from flask_mailman import Mail
import requests
import pymongo
import pymongo.database
import pymongo.errors
from pymongo.collection import ReturnDocument
from pymongo.client_session import ClientSession
from pymongo.read_concern import ReadConcern
from pymongo.read_preferences import ReadPreference
from pymongo.results import UpdateResult
from pymongo.write_concern import WriteConcern
from bson.objectid import ObjectId

from shrunk.util.ldap import query_given_name
from shrunk.util.string import get_domain
from shrunk.util.ldap import is_valid_netid
from shrunk.mongo_schema import (
    AccessRequestDocument,
    AdminStatsDocument,
    EndpointStatsRow,
    GeoIpStatsResult,
    DailyVisitsRow,
    LinkAclEntry,
    LinkDocument,
    LinkOwnerInfo,
    MongoRef,
    OrgDocument,
    PendingAccessRequestDocument,
    VisitCountSummary,
    VisitDocument,
)
from . import aggregations

from .geoip import GeoipClient
from .exceptions import (
    NoSuchObjectException,
    BadAliasException,
    BadLongURLException,
    InvalidACL,
    NotUserOrOrg,
    OrgOwnedLinkNotSupported,
    SecurityRiskDetected,
    BulkLinkValidationError,
)

if TYPE_CHECKING:
    from shrunk.client import ShrunkClient

__all__ = ["LinksClient"]


class LinksClient:
    """A class for database interactions. This class defines core
    database-manipulation methods. Other methods are defined in the
    mixins classes from which this class inherits."""

    ALPHABET = string.digits + string.ascii_lowercase
    """The alphabet used for encoding short urls."""

    URL_MIN = 46656
    """The shortest allowable URL.

    This is the value of '1000' in the URL base encoding. Guarantees that all
    URLs are at least four characters long.
    """

    URL_MAX = 2821109907455
    """The longest allowable URL.

    This is the value of 'zzzzzzzz' in the URL base encoding. Guarantees that
    all URLs do not exceed eight characters.
    """

    def __init__(
        self,
        *,
        db: pymongo.database.Database,
        geoip: GeoipClient,
        RESERVED_WORDS: Set[str],
        BANNED_REGEXES: List[str],
        other_clients: "ShrunkClient",
    ):
        self.db = db
        self.geoip = geoip
        self.reserved_words = RESERVED_WORDS
        self.banned_regexes = [re.compile(regex, re.IGNORECASE) for regex in BANNED_REGEXES]
        self.tracking_pixel_ui_enabled = bool(int(os.getenv("SHRUNK_TRACKING_PIXELS_ENABLED", "0")))
        self.other_clients = other_clients

    def alias_is_reserved(self, alias: str) -> bool:
        """Check whether a string is a reserved word that cannot be used as a short url.
        :param url: the prospective short url."""
        if alias in self.reserved_words:
            return True
        return any(alias in str(route) for route in current_app.url_map.iter_rules())

    def alias_is_duplicate(self, alias: str, is_tracking_pixel: bool) -> bool:
        """Check whether the given alias already exists"""

        # check to see if the alias is already being used
        result = self.db.urls.find_one(
            {
                "$or": [
                    {"is_tracking_pixel_link": {"$exists": False}},
                    {"is_tracking_pixel_link": is_tracking_pixel},
                ],
                "alias": {"$regex": f"^{alias}$", "$options": "i"},
                "deleted": False,
            }
        )
        return result is not None

    def _long_url_is_phished(self, long_url: str) -> bool:
        """Check whether the given long url is present in the phishing blacklist."""
        return self.db.phishTank.find_one({"url": long_url.rstrip()}) is not None

    def long_url_is_blocked(self, long_url: str) -> bool:
        """Check whether a url is blocked in the database or config file.
        :param long_url: The long url to query."""
        if any(regex.search(long_url) for regex in self.banned_regexes):
            return True
        if self._long_url_is_phished(long_url):
            return True
        domain = get_domain(long_url)
        if not domain:
            return False
        return bool(
            list(
                self.db.grants.aggregate(
                    [
                        {"$match": {"role": "blocked_url"}},
                        {"$addFields": {"idx": {"$indexOfCP": ["$entity", domain]}}},
                        {"$match": {"idx": {"$ne": -1}}},
                    ]
                )
            )
        )

    def redirects_to_blocked_url(self, long_url: str) -> bool:
        """Follows the url to check whether it redirects to a blocked url.
        :param long_url: The long url to query
        """
        try:
            redirected_url = requests.head(long_url, allow_redirects=True, timeout=0.5).url
        except requests.exceptions.RequestException:
            return False
        return self.long_url_is_blocked(redirected_url)

    def id_of_alias(self, alias: str) -> Optional[ObjectId]:
        """Get the ``_id`` field associated with the short url.
        :param short_url: a short url
        :returns: An :py:class:`~bson.objectid.ObjectId` if the short url exists, or None otherwise.
        """
        result = self.get_link_info_by_alias(alias)
        return result["_id"] if result is not None else None

    def create(
        self,
        title: str,
        long_url: str,
        alias: Optional[str],
        expiration_time: Optional[datetime],
        owner: MongoRef,
        creator_ip: str,
        domain: str = "",
        viewers: Optional[List[LinkAclEntry]] = None,
        editors: Optional[List[LinkAclEntry]] = None,
        bypass_security_measures: bool = False,
        is_tracking_pixel_link: bool = False,
        extension: Optional[str] = None,
        created_using_api: bool = False,
        created_with_superToken: bool = False,
    ) -> Tuple[ObjectId, str]:
        if viewers is None:
            viewers = []
        if editors is None:
            editors = []

        if self.long_url_is_blocked(long_url):
            raise BadLongURLException

        if self.redirects_to_blocked_url(long_url):
            raise BadLongURLException

        self.assert_valid_acl_entry("owner", owner)

        org: Optional[OrgDocument] = None
        if created_using_api:
            org = self.other_clients.orgs.get_org(ObjectId(owner["_id"]))
            if org is None:
                raise NoSuchObjectException

        for member in viewers + editors:
            if member["type"] == "org":
                try:
                    member["_id"] = ObjectId(member["_id"])
                except Exception as exc:
                    raise NotUserOrOrg from exc

        for acl in ["viewers", "editors"]:
            members = {"viewers": viewers, "editors": editors}[acl]
            for member in members:
                self.assert_valid_acl_entry(acl, member)

        # Ban the creation of links with multiple aliases
        # (https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/274)

        if alias is None:
            if created_using_api:
                assert org is not None
                if created_with_superToken:
                    alias = self.create_random_alias(extension=extension, orgAlias=None)
                else:
                    alias = self.create_random_alias(extension=extension, orgAlias=org["name"].replace(" ", ""))
            else:
                alias = self.create_random_alias(extension=extension, orgAlias=None)
        else:
            # Ban the future use of creating case-sensitive aliases
            # (https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/205)
            alias = alias.lower()
            if created_using_api:
                assert org is not None
                if not created_with_superToken:
                    alias = org["name"].replace(" ", "") + "-" + alias

            assert alias is not None
            if not bool(re.fullmatch(r"^[a-zA-Z0-9_\-\.]+$", alias)):
                raise BadAliasException

            if self.alias_is_reserved(alias):
                raise BadAliasException

            if self.alias_is_duplicate(alias, False):
                raise BadAliasException

        document = {
            "title": title,
            "alias": alias,
            "long_url": long_url,
            "timeCreated": datetime.now(timezone.utc),
            "visits": 0,
            "unique_visits": 0,
            "deleted": False,
            "creator_ip": creator_ip,
            "expiration_time": expiration_time,
            "owner": owner,
            "domain": domain,
            "viewers": viewers,
            "editors": editors,
            "is_tracking_pixel_link": is_tracking_pixel_link,
            "created_using_api": created_using_api,
        }

        if is_tracking_pixel_link:
            document["is_trackingpixel_legacy_endpoint"] = False

        if not bypass_security_measures and self.other_clients.security.security_risk_detected(long_url):
            self.other_clients.security.create_pending_link(document)
            raise SecurityRiskDetected
        try:
            result = self.db.urls.insert_one(document)
        except pymongo.errors.DuplicateKeyError as exc:
            raise BadAliasException from exc

        assert alias is not None
        return result.inserted_id, alias

    def modify(
        self,
        link_id: ObjectId,
        *,
        title: Optional[str] = None,
        long_url: Optional[str] = None,
        expiration_time: Optional[datetime] = None,
        owner: Optional[MongoRef] = None,
        alias: Optional[str] = None,
    ) -> None:
        if long_url is not None and self.long_url_is_blocked(long_url):
            raise BadLongURLException
        if title is None and long_url is None and expiration_time is None and owner is None and alias is None:
            return

        if long_url is not None and self.other_clients.security.security_risk_detected(long_url):
            raise SecurityRiskDetected

        link_info = self.get_link_info(link_id)

        fields: Dict[str, Any] = {}
        update: Dict[str, Any] = {"$set": fields}
        if title is not None:
            fields["title"] = title
        if long_url is not None:
            fields["long_url"] = long_url
        if expiration_time is not None:
            fields["expiration_time"] = expiration_time
        if alias is not None:
            fields["alias"] = alias
        if owner is not None:
            if owner["type"] == "netid" and is_valid_netid(cast(str, owner["_id"])):
                fields["owner"] = {"_id": owner["_id"], "type": "netid"}
                update["$push"] = {
                    "ownership_transfer_history": {
                        "from": link_info["owner"],
                        "to": {"_id": owner["_id"], "type": "netid"},
                        "timestamp": datetime.now(timezone.utc),
                    },
                }
                if link_info["owner"]["type"] == "org":
                    # Push org to editors since it is no longer owner
                    update["$push"]["editors"] = {"_id": link_info["owner"]["_id"], "type": "org"}
                    update["$push"]["viewers"] = {"_id": link_info["owner"]["_id"], "type": "org"}
            else:
                fields["owner"] = {"_id": ObjectId(owner["_id"]), "type": "org"}
                update["$push"] = {
                    "ownership_transfer_history": {
                        "from": {
                            "_id": link_info["owner"]["_id"],
                            "type": link_info["owner"]["type"],
                        },
                        "to": {"_id": ObjectId(owner["_id"]), "type": "org"},
                        "timestamp": datetime.now(timezone.utc),
                    },
                }
                # Remove the org from editors and viewers list since it is now
                update["$pull"] = {
                    "editors": {"_id": ObjectId(owner["_id"])},
                    "viewers": {"_id": ObjectId(owner["_id"])},
                }

        result = self.db.urls.update_one({"_id": link_id}, update)
        if result.matched_count != 1:
            raise NoSuchObjectException

    def check_link_exists(self, long_url: str, owner: MongoRef) -> Tuple[ObjectId, str]:
        self.assert_valid_acl_entry("owner", owner)

        query = {
            "long_url": long_url,
            "deleted": False,
            "is_tracking_pixel_link": False,
            "$or": [
                {"expiration_time": {"$gt": datetime.now(timezone.utc)}},
                {"expiration_time": None},
            ],
        }

        if owner["type"] == "org":
            query["owner._id"] = owner["_id"]
            result = self.db.urls.find_one(query)
        else:
            result = self.db.urls.find_one(query)

        if result:
            return result["_id"], result["alias"]
        raise NoSuchObjectException

    def assert_valid_acl_entry(self, acl: str, entry: LinkAclEntry) -> None:
        target = entry["_id"]
        mtype = entry["type"]
        if mtype == "org":
            try:
                ObjectId(target)
            except Exception as exc:
                raise NotUserOrOrg(f"{target} is not a valid {mtype}. can't add to {acl}") from exc

        if (mtype == "netid" and not is_valid_netid(cast(str, target))) or (
            mtype == "org" and not self.other_clients.orgs.get_org(ObjectId(target))
        ):
            raise NotUserOrOrg(f"{target} is not a valid {mtype}. can't add to {acl}")

    def modify_acl(self, link_id: ObjectId, entry: LinkAclEntry, add: bool, acl: str) -> None:
        info = self.get_link_info(link_id)

        # dont modify if they are owner
        if entry["_id"] == info["owner"]["_id"] and entry["type"] == info["owner"]["type"]:
            return
        # make sure we don't add a dupe if they already have the perm
        operator = "$addToSet"
        if not add:
            operator = "$pull"
        acls = ["editors", "viewers"]
        if acl not in acls:
            raise InvalidACL("acl to modify must be in " + str(acls))
        self.assert_valid_acl_entry(acl, entry)
        change = {acl: entry}

        # editors always have view permission

        # SHARING_ACL_REFACTOR: study why editors/viewers are stored separately.
        # Refactor opportunity: single "collaborators" field with permission key.

        if acl == "editors" and add:
            change["viewers"] = entry

        if acl == "viewers" and not add:
            change["editors"] = entry

        self.db.urls.update_one({"_id": link_id}, {operator: change})

    def _bulk_permission_context(
        self,
        netid: str,
        session: ClientSession,
    ) -> Tuple[bool, Set[ObjectId], Set[ObjectId]]:
        user = self.db.users.find_one({"netid": netid}, session=session) or {}
        is_admin = any(role.get("role") == "admin" for role in user.get("roles", []))
        organizations = self.db.organizations.find(
            {"members.netid": netid, "deleted": False},
            session=session,
        )
        member_org_ids: Set[ObjectId] = set()
        admin_org_ids: Set[ObjectId] = set()
        for organization in organizations:
            member_org_ids.add(organization["_id"])
            if any(
                member.get("netid") == netid and member.get("role") == "admin"
                for member in organization.get("members", [])
            ):
                admin_org_ids.add(organization["_id"])
        return is_admin, member_org_ids, admin_org_ids

    @staticmethod
    def _may_bulk_edit(link: Dict[str, Any], netid: str, member_org_ids: Set[ObjectId]) -> bool:
        owner = link["owner"]
        if owner["type"] == "netid" and owner["_id"] == netid:
            return True
        if owner["type"] == "org" and owner["_id"] in member_org_ids:
            return True
        return any(
            editor["_id"] == netid or (editor["type"] == "org" and editor["_id"] in member_org_ids)
            for editor in link.get("editors", [])
        )

    @staticmethod
    def _may_bulk_own(link: Dict[str, Any], netid: str, admin_org_ids: Set[ObjectId]) -> bool:
        owner = link["owner"]
        return (owner["type"] == "netid" and owner["_id"] == netid) or (
            owner["type"] == "org" and owner["_id"] in admin_org_ids
        )

    def _validate_bulk_links(
        self,
        link_ids: List[ObjectId],
        original_ids: List[str],
        netid: str,
        permission: str,
        session: ClientSession,
    ) -> List[Dict[str, Any]]:
        is_admin, member_org_ids, admin_org_ids = self._bulk_permission_context(netid, session)
        links_by_id = {link["_id"]: link for link in self.db.urls.find({"_id": {"$in": link_ids}}, session=session)}
        failed_ids: List[str] = []
        links: List[Dict[str, Any]] = []
        for object_id, original_id in zip(link_ids, original_ids):
            link = links_by_id.get(object_id)
            allowed = False
            if link is not None and not link.get("deleted", False):
                allowed = is_admin or (
                    self._may_bulk_edit(link, netid, member_org_ids)
                    if permission == "edit"
                    else self._may_bulk_own(link, netid, admin_org_ids)
                )
            if not allowed:
                failed_ids.append(original_id)
            else:
                assert link is not None
                links.append(link)
        if failed_ids:
            raise BulkLinkValidationError(failed_ids)
        return links

    def _run_bulk_transaction(self, callback: Any) -> None:
        with self.other_clients.conn.start_session() as session:
            session.with_transaction(
                callback,
                read_concern=ReadConcern("snapshot"),
                write_concern=WriteConcern("majority"),
                read_preference=ReadPreference.PRIMARY,
            )

    def modify_acl_bulk(
        self,
        link_ids: List[ObjectId],
        original_ids: List[str],
        netid: str,
        entry: Dict[str, Any],
        add: bool,
        acl: str,
    ) -> None:
        if acl not in {"editors", "viewers"}:
            raise InvalidACL("acl to modify must be editors or viewers")
        self.assert_valid_acl_entry(acl, entry)

        def transaction(session: ClientSession) -> None:
            if (
                entry["type"] == "org"
                and self.db.organizations.find_one(
                    {"_id": entry["_id"], "deleted": False},
                    session=session,
                )
                is None
            ):
                raise NotUserOrOrg("collaborator is not an active organization")
            links = self._validate_bulk_links(link_ids, original_ids, netid, "edit", session)
            operator = "$addToSet" if add else "$pull"
            change = {acl: entry}
            if acl == "editors" and add:
                change["viewers"] = entry
            if acl == "viewers" and not add:
                change["editors"] = entry
            for link in links:
                if entry["_id"] == link["owner"]["_id"] and entry["type"] == link["owner"]["type"]:
                    continue
                self.db.urls.update_one(
                    {"_id": link["_id"]},
                    {operator: change},
                    session=session,
                )

        self._run_bulk_transaction(transaction)

    def transfer_bulk(
        self,
        link_ids: List[ObjectId],
        original_ids: List[str],
        netid: str,
        owner: Dict[str, Any],
    ) -> None:
        def transaction(session: ClientSession) -> None:
            if owner["type"] == "org":
                user = self.db.users.find_one({"netid": netid}, session=session) or {}
                is_admin = any(role.get("role") == "admin" for role in user.get("roles", []))
                owner_query: Dict[str, Any] = {"_id": owner["_id"], "deleted": False}
                if not is_admin:
                    owner_query["members.netid"] = netid
                if self.db.organizations.find_one(owner_query, session=session) is None:
                    raise NotUserOrOrg("new owner is not an active organization available to this user")
            links = self._validate_bulk_links(link_ids, original_ids, netid, "owner", session)
            timestamp = datetime.now(timezone.utc)
            for link in links:
                previous_owner = link["owner"]
                update: Dict[str, Any] = {
                    "$set": {"owner": owner},
                    "$push": {
                        "ownership_transfer_history": {
                            "from": previous_owner,
                            "to": owner,
                            "timestamp": timestamp,
                        }
                    },
                }
                if owner["type"] == "org":
                    update["$pull"] = {
                        "editors": {"_id": owner["_id"]},
                        "viewers": {"_id": owner["_id"]},
                    }
                elif previous_owner["type"] == "org":
                    update["$addToSet"] = {
                        "editors": previous_owner,
                        "viewers": previous_owner,
                    }
                self.db.urls.update_one({"_id": link["_id"]}, update, session=session)

        self._run_bulk_transaction(transaction)

    def delete_bulk_transactional(
        self,
        link_ids: List[ObjectId],
        original_ids: List[str],
        netid: str,
    ) -> None:
        def transaction(session: ClientSession) -> None:
            links = self._validate_bulk_links(link_ids, original_ids, netid, "owner", session)
            result = self.db.urls.update_many(
                {"_id": {"$in": [link["_id"] for link in links]}, "deleted": False},
                {
                    "$set": {
                        "deleted": True,
                        "deleted_by": netid,
                        "deleted_time": datetime.now(timezone.utc),
                    }
                },
                session=session,
            )
            if result.modified_count != len(links):
                raise BulkLinkValidationError(original_ids)

        self._run_bulk_transaction(transaction)

    def clear_visits(self, link_id: ObjectId) -> None:
        self.db.visits.delete_many({"link_id": link_id})
        self.db.urls.update_one({"_id": link_id}, {"$set": {"visits": 0, "unique_visits": 0}})

    def delete(self, link_id: ObjectId, deleted_by: str) -> None:
        result = self.db.urls.update_one(
            {"_id": link_id, "deleted": False},
            {
                "$set": {
                    "deleted": True,
                    "deleted_by": deleted_by,
                    "deleted_time": datetime.now(timezone.utc),
                }
            },
        )
        if result.modified_count != 1:
            raise NoSuchObjectException

    def delete_bulk(self, link_ids: List[ObjectId], deleted_by: str) -> None:
        result = self.db.urls.update_many(
            {"_id": {"$in": link_ids}, "deleted": False},
            {
                "$set": {
                    "deleted": True,
                    "deleted_by": deleted_by,
                    "deleted_time": datetime.now(timezone.utc),
                }
            },
        )
        if result.modified_count != len(link_ids):
            raise NoSuchObjectException

    def remove_expiration_time(self, link_id: ObjectId) -> None:
        result = self.db.urls.update_one({"_id": link_id}, {"$set": {"expiration_time": None}})
        if result.matched_count != 1:
            raise NoSuchObjectException

    def delete_visits(self, link_id: ObjectId) -> None:
        self.db.visits.delete_many({"link_id": link_id})
        result = self.db.urls.update_one({"_id": link_id}, {"$set": {"visits": 0, "unique_visits": 0}})
        if result.modified_count != 1:
            raise NoSuchObjectException

    def get_daily_visits(
        self,
        link_id: ObjectId,
        alias: Optional[str] = None,
        date_range: Optional[Tuple[datetime, datetime]] = None,
        source: Optional[str] = None,
    ) -> List[DailyVisitsRow]:
        """Given a short URL, return how many visits and new unique
           visitors it gets per day for the given date range.
        :param short_url: A shortened URL
        :param date_range: Date range to consider, defaults to one year from today
        """

        match: Dict[str, Any]
        if alias is None:
            match = {"$match": {"link_id": link_id}}
        else:
            match = {"$match": {"link_id": link_id, "alias": alias}}

        if source:
            match["$match"]["source"] = source

        if date_range is None:
            date_match = {"$match": {"time": {"$gte": datetime.now() - timedelta(days=365)}}}
        else:
            date_match = {"$match": {"time": {"$gte": date_range[0], "$lte": date_range[1]}}}

        aggregation = [match] + [date_match] + cast(List[Any], aggregations.visits_aggregation)
        return cast(List[DailyVisitsRow], list(self.db.visits.aggregate(aggregation, allowDiskUse=True)))

    def get_geoip_stats(
        self,
        link_id: Optional[ObjectId] = None,
        alias: Optional[str] = None,
        source: Optional[str] = None,
    ) -> GeoIpStatsResult:
        if alias is not None:
            assert link_id is not None

        aggregation = []
        if link_id is not None:
            match: Dict[str, Any]
            if alias is None:
                match = {"$match": {"link_id": link_id}}
            else:
                match = {"$match": {"link_id": link_id, "alias": alias}}

            if source:
                match["$match"]["source"] = source

            aggregation.append(match)
        aggregation.append(
            {
                "$facet": {
                    "us": [
                        {
                            "$match": {
                                "country_code": "US",
                                "state_code": {"$exists": True, "$ne": None},
                            }
                        },
                        {"$group": {"_id": "$state_code", "value": {"$sum": 1}}},
                        {"$addFields": {"code": "$_id"}},
                        {"$project": {"_id": 0}},
                    ],
                    "world": [
                        {"$match": {"country_code": {"$exists": True, "$ne": None}}},
                        {"$group": {"_id": "$country_code", "value": {"$sum": 1}}},
                        {"$addFields": {"code": "$_id"}},
                        {"$project": {"_id": 0}},
                    ],
                },
            }
        )
        return cast(GeoIpStatsResult, next(self.db.visits.aggregate(aggregation)))

    def get_overall_visits(
        self,
        link_id: ObjectId,
        alias: Optional[str] = None,
        source: Optional[str] = None,
    ) -> VisitCountSummary:
        if alias is None:
            info = self.get_link_info(link_id)

            if source:
                filter_query = {"link_id": link_id, "source": source}
                total_visits = self.db.visits.count_documents(filter_query)
                visits = self.db.visits.aggregate(
                    [
                        {"$match": filter_query},
                        {"$group": {"_id": "$tracking_id"}},
                        {"$count": "count"},
                    ],
                    allowDiskUse=True,
                )
                unique_visits = next(visits, {"count": 0})
                return {
                    "total_visits": total_visits,
                    "unique_visits": unique_visits["count"],
                }

            return {
                "total_visits": info["visits"],
                "unique_visits": info.get("unique_visits", 0),
            }

        # If alias is not None, execute an aggregation to compute the stats.
        result = next(
            self.db.visits.aggregate(
                [
                    {
                        "$match": {
                            "link_id": link_id,
                            "alias": alias,
                        }
                    },
                    {
                        "$facet": {
                            "total_visits": [{"$count": "count"}],
                            "unique_visits": [
                                {"$group": {"_id": "$tracking_id"}},
                                {"$count": "count"},
                            ],
                        }
                    },
                ]
            )
        )
        if not result["total_visits"] or not result["unique_visits"]:
            return {"total_visits": 0, "unique_visits": 0}
        return {
            "total_visits": result["total_visits"][0]["count"],
            "unique_visits": result["unique_visits"][0]["count"],
        }

    def get_visits(
        self,
        link_id: ObjectId,
        alias: Optional[str] = None,
        mid: Optional[Union[str, List[str]]] = None,
        uid: Optional[Union[str, List[str]]] = None,
        source: Optional[str] = None,
    ) -> List[VisitDocument]:
        query: Dict[str, Any] = {"link_id": link_id}
        if alias is not None:
            query["alias"] = alias
        if mid is not None:
            if isinstance(mid, list):
                query["mid"] = {"$in": mid}
            else:
                query["mid"] = mid
        if uid is not None:
            if isinstance(uid, list):
                query["uid"] = {"$in": uid}
            else:
                query["uid"] = uid
        if source is not None:
            query["source"] = source
        result = self.db.visits.find(query)
        return list(result)

    def create_random_alias(self, extension: Optional[str] = None, orgAlias: Optional[str] = None) -> str:
        while True:
            alias = self._generate_unique_key()
            if orgAlias:
                alias = orgAlias + "-" + alias
            if extension:
                alias += extension
            if not self.alias_is_reserved(alias):
                return alias

    def get_owner(self, link_id: ObjectId) -> LinkOwnerInfo:

        result = self.db.urls.find_one({"_id": link_id})

        if result is None:
            raise NoSuchObjectException

        if result["owner"]["type"] == "org":
            res = self.other_clients.orgs.get_org(ObjectId(result["owner"]["_id"]))
            if res is None:
                raise NoSuchObjectException
            owner: LinkOwnerInfo = {
                "_id": result["owner"]["_id"],
                "type": "org",
                "org_name": res["name"],
            }
            return owner

        return cast(LinkOwnerInfo, result["owner"])

    def is_owner(self, link_id: ObjectId, netid: str) -> bool:
        result = self.db.urls.find_one({"_id": link_id})
        if result is None:
            raise NoSuchObjectException
        if result["owner"]["type"] == "netid":
            return result["owner"]["_id"] == netid
        if self.other_clients.orgs.is_admin(
            ObjectId(result["owner"]["_id"]), netid
        ):  # Org admins have "owner" permissions
            return True
        return False

    def may_edit(self, link_id: ObjectId, netid: str) -> bool:
        if self.other_clients.users.has_role(netid, "admin"):
            return True

        orgs = self.other_clients.orgs.get_orgs(netid, only_member_orgs=True)
        org_ids = [org["id"] for org in orgs]

        result = self.db.urls.find_one(
            {
                "$or": [
                    {"_id": link_id, "owner._id": netid},  # owner
                    {
                        "_id": link_id,
                        "editors": {"$elemMatch": {"_id": netid}},
                    },  # shared
                    {
                        "_id": link_id,
                        "editors": {"$elemMatch": {"_id": {"$in": org_ids}}},
                    },  # shared with org
                    {
                        "_id": link_id,
                        "owner._id": {"$in": org_ids},  # user is in org that owns the link
                    },
                ]
            }
        )
        return result is not None

    def may_view(self, link_id: ObjectId, netid: str) -> bool:
        orgs = self.other_clients.orgs.get_orgs(netid, True)
        org_ids = [org["id"] for org in orgs]
        result = self.db.urls.find_one(
            {
                "$or": [
                    {"_id": link_id, "owner._id": netid},  # owner
                    {  # editor
                        "_id": link_id,
                        "editors": {"$elemMatch": {"_id": netid}},
                    },
                    {
                        "_id": link_id,
                        "viewers": {"$elemMatch": {"_id": netid}},
                    },  # viewer
                    {
                        "_id": link_id,
                        "viewers": {"$elemMatch": {"_id": {"$in": org_ids}}},
                    },  # shared with org
                    {
                        "_id": link_id,
                        "owner._id": {"$in": org_ids},  # user is in org that owns the link
                    },
                ]
            }
        )
        return result is not None

    def get_admin_stats(self) -> AdminStatsDocument:
        """Get some basic overall stats about Shrunk"""
        links = self.db.urls.count_documents({})
        visits = self.db.visits.estimated_document_count()
        users_cursor = self.db.urls.aggregate(
            [
                {"$group": {"_id": "$netid"}},
                {"$count": "count"},
            ]
        )
        try:
            users = cast(int, list(users_cursor)[0]["count"])
        except IndexError, KeyError:
            users = 0
        return {
            "links": links,
            "visits": visits,
            "users": users,
        }

    def get_endpoint_stats(self) -> List[EndpointStatsRow]:
        """Summarizes of the information in the endpoint_statistics collection."""

        def ignore_endpoint(endpoint: str) -> Any:
            return {"$match": {"endpoint": {"$not": {"$eq": endpoint}}}}

        IGNORE_ENDPOINTS = [
            "redirect_link",
            "static",
            "redirect_to_real_index",
            "shrunk.render_index",
            "shrunk.render_login",
        ]

        return cast(
            List[EndpointStatsRow],
            list(
                self.db.endpoint_statistics.aggregate(
                    [
                        {
                            "$group": {
                                "_id": {"endpoint": "$endpoint"},
                                "total_visits": {"$sum": "$count"},
                                "unique_visits": {"$sum": 1},
                            }
                        },
                        {"$addFields": {"endpoint": "$_id.endpoint"}},
                        {"$project": {"_id": 0}},
                    ]
                    + [ignore_endpoint(ep) for ep in IGNORE_ENDPOINTS]
                )
            ),
        )

    def get_link_info(self, link_id: ObjectId, is_tracking_pixel: Optional[bool] = None) -> LinkDocument:
        if is_tracking_pixel:
            result = self.db.urls.find_one({"_id": link_id, "is_tracking_pixel_link": is_tracking_pixel})
        else:
            result = self.db.urls.find_one({"_id": link_id})
        if result is None:
            raise NoSuchObjectException
        return cast(LinkDocument, result)

    def get_link_info_by_alias(self, alias: str) -> Optional[LinkDocument]:
        return cast(
            Optional[LinkDocument],
            self.db.urls.find_one({"alias": alias, "deleted": False}),
        )

    def _verify_link_alias_is_valid(self, alias):
        """
        Finds a link by an alias and verifies that it is still valid
        """
        result = self.get_link_info_by_alias(alias)

        # Fail if the link does not exist
        if result is None:
            alias = alias.lower()
            result = self.get_link_info_by_alias(alias)

        if result is None:
            return None

        # Fail if the link exists in the database but has been deleted
        if result.get("deleted"):
            return None

        # Fail if the link exists but has expired
        expiration_time = result.get("expiration_time")
        current_time = datetime.now(timezone.utc)
        if expiration_time and current_time >= expiration_time:
            return None

        return result

    def is_tracking_pixel_link(self, alias: str) -> bool:
        result = self._verify_link_alias_is_valid(alias)

        if result is None:
            return False

        return result.get("is_tracking_pixel_link", False)

    def get_long_url(self, alias: str) -> Optional[str]:
        """Given a short URL, returns the long URL.

        Performs a case-insensitive search for the corresponding long URL.

        :param short_url: A shortened URL

        :returns:
          The long URL, or None if the short URL does not exist.
        """
        result = self._verify_link_alias_is_valid(alias)

        if result is None:
            return None

        # Link exists and is valid; return its long URL
        return cast(str, result["long_url"])

    def get_custom_domain(self, alias: str) -> Optional[str]:
        """Given a short URL, returns the domain.
        (for now aliases are still 100% unique ideally different domains can use the same url)
        Performs a case-insensitive search for the corresponding long URL.

        :param short_url: A shortened URL

        :returns:
          The domain, or None if the short URL does not exist.
        """
        result = self._verify_link_alias_is_valid(alias)

        if result is None:
            return ""

        return cast(str, result.get("domain", ""))

    def visit(
        self,
        alias: str,
        tracking_id: Optional[str],
        source_ip: str,
        user_agent: Optional[str],
        referer: Optional[str],
        uid: Optional[str] = None,
        mid: Optional[str] = None,
        source: Optional[str] = None,
    ) -> None:
        """Visits the given URL and logs visit information.

        On visiting a URL, this is guaranteed to perform at least the following
        side effects if the short URL is valid:

          - Increment the hit counter
          - Log the visitor

        If the URL is invalid, no side effects will occur.

        :param short_url: The short URL visited
        :param tracking_id: The contents of the visitor's tracking cookie, if any
        :param source_ip: The client's IP address
        :param user_agent: The client's user agent
        :param referer: The client's referer
        :param uid: The user's unique identifier, if available
        :param mid: The mail ID, if available

        """
        resp = self.get_link_info_by_alias(alias)
        assert resp is not None

        if not self.db.visits.find_one({"link_id": resp["_id"], "tracking_id": tracking_id}):
            self.db.urls.update_one({"_id": resp["_id"]}, {"$inc": {"visits": 1, "unique_visits": 1}})
        else:
            self.db.urls.update_one({"_id": resp["_id"]}, {"$inc": {"visits": 1}})

        state_code, country_code = self.geoip.get_location_codes(source_ip)

        doc: VisitDocument = {
            "link_id": resp["_id"],
            "alias": alias,
            "tracking_id": tracking_id,
            "source_ip": source_ip,
            "time": datetime.now(timezone.utc),
            "user_agent": user_agent,
            "referer": referer,
            "state_code": state_code,
            "country_code": country_code,
        }

        if mid:
            doc["mid"] = mid

        if uid:
            doc["uid"] = uid

        if source:
            doc["source"] = source

        self.db.visits.insert_one(doc)

    @lru_cache(maxsize=2048)
    def get_visitor_id(self, ipaddr: str) -> str:
        """Gets a unique, opaque identifier for an IP address.

        :param ipaddr: a string containing an IPv4 address.

        :returns:
          A hexadecimal string which uniquely identifies the given IP address.
        """
        rec = {"ip": str(ipaddr)}
        res = self.db.visitors.find_one_and_update(
            rec,
            {"$setOnInsert": {"ip": str(ipaddr)}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        assert res is not None
        return res["_id"]

    def blacklist_user_links(self, netid: str) -> UpdateResult:
        return self.db.urls.update_many(
            {"owner._id": netid, "owner.type": "netid", "deleted": {"$ne": True}},
            {
                "$set": {
                    "deleted": True,
                    "deleted_by": "!BLACKLISTED",
                    "deleted_time": datetime.now(timezone.utc),
                }
            },
        )

    def unblacklist_user_links(self, netid: str) -> None:
        self.db.urls.update_many(
            {"owner._id": netid, "owner.type": "netid", "deleted": True, "deleted_by": "!BLACKLISTED"},
            {
                "$set": {"deleted": False},
                "$unset": {"deleted_by": 1, "deleted_time": 1},
            },
        )

    def block_urls(self, ids: List[ObjectId]) -> None:
        self.db.urls.update_many(
            {"_id": {"$in": ids}, "deleted": {"$ne": True}},
            {
                "$set": {
                    "deleted": True,
                    "deleted_by": "!BLOCKED",
                    "deleted_time": datetime.now(timezone.utc),
                }
            },
        )

    def unblock_urls(self, ids: List[ObjectId]) -> None:
        self.db.urls.update_many(
            {"_id": {"$in": ids}, "deleted": True, "deleted_by": "!BLOCKED"},
            {
                "$set": {"deleted": False},
                "$unset": {"deleted_by": 1, "deleted_time": 1},
            },
        )

    def request_edit_access(self, mail: Mail, link_id: ObjectId, requesting_netid: str) -> None:
        link_info = self.get_link_info(link_id)
        if link_info["owner"]["type"] != "netid":
            raise OrgOwnedLinkNotSupported

        token = secrets.token_bytes(16)
        document: AccessRequestDocument = {
            "token": token,
            "link_id": link_id,
            "requesting_netid": requesting_netid,
            "state": "pending",
            "created_at": datetime.now(timezone.utc),
            "resolved_at": None,
        }
        self.db.access_requests.insert_one(document)

        owner_netid: str = cast(str, link_info["owner"]["_id"])
        owner_given_name = query_given_name(owner_netid)
        accept_url = url_for("shrunk.accept_access_request", token=token, _external=True)
        deny_url = url_for("shrunk.deny_access_request", token=token, _external=True)

        plaintext_message = f"""Dear {owner_given_name},

You are receiving this message because the user {requesting_netid} has requested
access to edit your link "{link_info["title"]}".

You may follow the following link to accept the request:
    {accept_url}

or the following link to deny the request:
    {deny_url}

Please do not reply to this email. You may direct any questions to oss@oit.rutgers.edu.
"""

        html_message = f"""
<!DOCTYPE html>
<html lang="en-US">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
            * {{
                font-family: Arial, sans-serif;
            }}

            .requesting-user {{
                font-weight: bold;
            }}

            .btn {{
                display: block;
                padding: 10px;
                width: 200px;
                text-align: center;
                color: white;
                font-weight: bold;
                text-decoration: none;
                border-radius: 3px;
                transition: background-color 0.3s ease-in-out;
            }}

            .btn.accept {{
                background-color: #139702;
            }}

            .btn.deny {{
                background-color: #cc0033;
            }}

            .btn.accept:hover {{
                background-color: #18df02;
            }}

            .btn.deny:hover {{
                background-color: #ff0040;
            }}

            .btn:last-of-type {{
                margin-top: 7px;
            }}
        </style>
    </head>
    <body>
        <p>Dear {owner_netid},</p>

        <p>You are receiving this message because the user <span class="requesting-user">{requesting_netid}</span>
        has requested access to edit your link &ldquo;{link_info["title"]}&rdquo;. Please use the buttons
        below to accept or deny the request.</p>

        <div>
            <a class="btn accept" href="{accept_url}">Accept request</a>
            <a class="btn deny" href="{deny_url}">Deny request</a>
        </div>

        <p>Please do not reply to this email. You may direct any questions to
        <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</p>
    </body>
</html>
"""

        mail.send_mail(
            subject=f'{requesting_netid} is requesting edit access to "{link_info["title"]}"',
            message=plaintext_message,
            html_message=html_message,
            from_email="go-support@oit.rutgers.edu",
            recipient_list=[f"{owner_netid}@rutgers.edu"],
        )

    def active_request_exists(self, _mail: Mail, link_id: ObjectId, requesting_netid: str) -> bool:
        request = self.db.access_requests.find_one(
            {
                "link_id": link_id,
                "requesting_netid": requesting_netid,
                "state": "pending",
            }
        )
        return request is not None

    def cancel_request_edit_access(self, _mail: Mail, link_id: ObjectId, requesting_netid: str) -> None:
        self.db.access_requests.delete_many({"link_id": link_id, "requesting_netid": requesting_netid})

    def check_access_request_permission(self, token: bytes, netid: str) -> bool:
        request = self.db.access_requests.find_one({"token": token})
        if request is None:
            raise NoSuchObjectException
        link_info = self.get_link_info(request["link_id"])
        return cast(bool, link_info["owner"]["_id"] == netid and request["state"] == "pending")

    def accept_access_request(self, token: bytes) -> None:
        request = self.db.access_requests.find_one({"token": token})
        if request is None:
            raise NoSuchObjectException
        if request["state"] != "pending":
            return
        user = {
            "_id": request["requesting_netid"],
            "type": "netid",
        }
        self.db.urls.update_one(
            {"_id": request["link_id"]},
            {"$addToSet": {"viewers": user, "editors": user}},
        )
        self.db.access_requests.update_one(
            {"token": request["token"]},
            {
                "$set": {
                    "state": "accepted",
                    "resolved_at": datetime.now(timezone.utc),
                }
            },
        )

    def deny_access_request(self, token: bytes) -> None:
        request = self.db.access_requests.find_one({"token": token})
        if request is None:
            raise NoSuchObjectException
        if request["state"] != "pending":
            return
        self.db.access_requests.update_one(
            {"token": request["token"]},
            {
                "$set": {
                    "state": "denied",
                    "resolved_at": datetime.now(timezone.utc),
                }
            },
        )

    def get_pending_access_requests(self, netid: str) -> List[PendingAccessRequestDocument]:
        return cast(
            List[PendingAccessRequestDocument],
            list(
                self.db.urls.aggregate(
                    [
                        {"$match": {"owner._id": netid, "owner.type": "netid"}},
                        {
                            "$lookup": {
                                "from": "access_requests",
                                "localField": "_id",
                                "foreignField": "link_id",
                                "as": "request",
                            }
                        },
                        {"$unwind": "$request"},
                        {"$match": {"request.state": "pending"}},
                    ]
                )
            ),
        )

    def get_tracking_pixel_ui_status(self) -> bool:
        return self.tracking_pixel_ui_enabled

    @classmethod
    def _generate_unique_key(cls) -> str:
        """Generates a unique key."""

        return cls._base_encode(random.randint(cls.URL_MIN, cls.URL_MAX))

    @classmethod
    def _base_encode(cls, integer: int) -> str:
        """Encodes an integer into our arbitrary link alphabet.

        Given an integer, convert it to base-36. Letters are case-insensitive;
        this function uses uppercase arbitrarily.

        :param integer: An integer.

        :returns:
          A string composed of characters from :py:attr:`BaseClient.ALPHABET`.
        """

        length = len(cls.ALPHABET)
        result = []
        while integer != 0:
            result.append(cls.ALPHABET[integer % length])
            integer //= length

        return "".join(reversed(result))

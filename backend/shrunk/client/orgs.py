"""Implements the :py:class:`OrgsClient` class."""

from datetime import datetime, timezone
from typing import Any, Optional, List, cast

from bson import ObjectId
import os
import pymongo
import pymongo.errors

__all__ = ["OrgsClient"]


class OrgsClient:
    """This class implements all orgs-related functionality."""

    def __init__(self, *, db: pymongo.database.Database):
        self.db = db
        self.domain_enabled = bool(int(os.getenv("SHRUNK_DOMAINS_ENABLED", 0)))

    def get_org(self, org_id: ObjectId) -> Optional[Any]:
        """Get information about a given org

        :param org_id: The org ID to query
        :returns: The Mongo document for the org, or ``None`` if no org
          exists with the provided ID
        """

        org = self.db.organizations.find_one({"_id": org_id})
        if org is None:
            return None

        # Organizations created before implementations of domains key do not have the `domains` field
        if org is not None and org.get("domains") is None:
            org["domains"] = []

        if org.get("access_tokens") is None:
            org["access_tokens"] = []

        return org

    def get_orgs(self, netid: str, only_member_orgs: bool) -> List[Any]:
        """Get a list of orgs

        :param netid: The NetID of the requesting user
        :param only_member_orgs: Whether or not to only return orgs of which
          the requesting user is a member
        :returns: See :py:func:`shrunk.api.org.get_orgs` for the format
          of the return value
        """
        aggregation: List[Any] = []
        if only_member_orgs:
            aggregation.append(
                {"$match": {"$and": [{"members.netid": netid}, {"deleted": False}]}}
            )
        aggregation += [
            {
                "$addFields": {
                    "matching_admins": {
                        "$filter": {
                            "input": "$members",
                            "cond": {
                                "$and": [
                                    {"$eq": ["$$this.netid", netid]},
                                    {"$eq": ["$$this.is_admin", True]},
                                ]
                            },
                        },
                    },
                },
            },
            {
                "$addFields": {
                    "id": "$_id",
                    "is_member": {"$in": [netid, "$members.netid"]},
                    "is_admin": {"$ne": [0, {"$size": "$matching_admins"}]},
                },
            },
            {"$project": {"_id": 0, "matching_admins": 0}},
        ]
        return list(self.db.organizations.aggregate(aggregation))

    def create(self, org_name: str) -> Optional[ObjectId]:
        """Create a new org

        :param org_name: The name of the org to create
        :returns: The ID of the newly-created org, or ``None`` if an error
          occurred
        """
        try:
            result = self.db.organizations.insert_one(
                {
                    "name": org_name,
                    "timeCreated": datetime.now(timezone.utc),
                    "members": [],
                    "domains": [],
                    "deleted": False,
                }
            )
        except pymongo.errors.DuplicateKeyError:
            return None
        return result.inserted_id

    def validate_name(self, org_name: str) -> bool:
        """Check whether a given name may be used as an org name

        :param org_name: The org name
        """
        result = self.db.organizations.find_one({"name": org_name})
        return result is None

    def rename_org(self, org_id: ObjectId, new_org_name: str) -> Optional[ObjectId]:
        """Renames an org to a new name given that the new name doesn't already exist.

        :param org_id:
        """

        matched = {"_id": org_id}
        update = {"$set": {"name": new_org_name}}

        result = self.db.organizations.update_one(matched, update)

        return cast(int, result.modified_count) == 1

    def has_associated_urls(self, org_id: ObjectId) -> bool:
        """check to see if orgs have any associations with urls before deletion

        :param org_id: The org ID

        returns Whether there are URLs associated with the org
        """
        assoicatedUrls = self.db.urls.count_documents(
            {"$or": [{"viewers._id": org_id}, {"editors._id": org_id}]}
        )
        if assoicatedUrls > 0:
            return True

        return False

    def delete(self, org_id: ObjectId, deleted_by: str) -> bool:
        """Delete an org

        :param org_id: The org ID
        :param deleted_by: The netid of the user requesting deletion

        :returns: Whether the org was successfully deleted
        """
        self.db.urls.update_many(
            {}, {"$pull": {"viewers": {"_id": org_id}, "editors": {"_id": org_id}}}
        )
        result = self.db.organizations.update_one(
            {"_id": org_id, "deleted": False},
            {
                "$set": {
                    "deleted": True,
                    "deleted_by": deleted_by,
                    "deleted_time": datetime.now(timezone.utc),
                }
            },
        )
        return result.modified_count == 1

    def get_members(self, org_id: ObjectId) -> List[Any]:
        return list(
            self.db.organizations.aggregate(
                [
                    {"$match": {"_id": org_id}},
                    {"$unwind": "$members"},
                    {"$replaceRoot": {"newRoot": "$members"}},
                ]
            )
        )

    def get_admin_count(self, org_id: ObjectId) -> int:
        """Get the number of admins in an org

        :param org_id: The org ID

        :returns: The number of admins in the org
        """
        result = self.db.organizations.aggregate(
            [
                {"$match": {"_id": org_id}},
                {"$unwind": "$members"},
                {"$match": {"members.is_admin": True}},
                {"$count": "admin_count"},
            ]
        )

        admin_count = next(result, {"admin_count": 0}).get("admin_count", 0)
        return admin_count

    def create_member(
        self, org_id: ObjectId, netid: str, is_admin: bool = False
    ) -> bool:
        match = {
            "_id": org_id,
            "members": {"$not": {"$elemMatch": {"netid": netid}}},
        }

        update = {
            "$addToSet": {
                "members": {
                    "netid": netid,
                    "is_admin": is_admin,
                    "timeCreated": datetime.now(timezone.utc),
                },
            },
        }

        result = self.db.organizations.update_one(match, update)
        return cast(int, result.modified_count) == 1

    def delete_member(self, org_id: ObjectId, netid: str) -> bool:
        result = self.db.organizations.update_one(
            {"_id": org_id}, {"$pull": {"members": {"netid": netid}}}
        )
        return cast(int, result.modified_count) == 1

    def set_member_admin(self, org_id: ObjectId, netid: str, is_admin: bool) -> bool:
        result = self.db.organizations.update_one(
            {"_id": org_id},
            {"$set": {"members.$[elem].is_admin": is_admin}},
            array_filters=[{"elem.netid": netid}],
        )
        return cast(int, result.modified_count) == 1

    def is_member(self, org_id: ObjectId, netid: str) -> bool:
        return (
            self.db.organizations.find_one({"_id": org_id, "members.netid": netid})
            is not None
        )

    def is_admin(self, org_id: ObjectId, netid: str) -> bool:
        result = self.db.organizations.find_one({"_id": org_id, "members.netid": netid})
        if result is None:
            return False
        for member in result["members"]:
            if member["netid"] == netid and member["is_admin"]:
                return True
        return False

    def create_domain(self, org_name: str, domain: str) -> bool:
        existing_domain = self.db.organizations.find_one({"domains.domain": domain})
        if domain in {"go", "shrunk"} or domain.startswith("localhost"):
            return False
        if existing_domain:
            return False
        org = self.db.organizations.find_one({"name": org_name})
        if org is None:
            return False
        try:
            update = {
                "$addToSet": {
                    "domains": {
                        "domain": domain,
                        "timeCreated": datetime.now(timezone.utc),
                    },
                },
            }
        except pymongo.errors.DuplicateKeyError:
            return False

        result = self.db.organizations.update_one(org, update)
        return cast(int, result.modified_count) == 1

    def delete_domain(self, org_name: str, domain: str) -> bool:
        org = self.db.organizations.find_one({"name": org_name})
        if org is None:
            return False
        try:
            update = {
                "$pull": {
                    "domains": {"domain": domain},
                },
            }
        except pymongo.errors.DuplicateKeyError:
            return False
        result = self.db.organizations.update_one({"name": org_name}, update)
        return cast(int, result.modified_count) == 1

    def get_domain_status(self) -> bool:
        return self.domain_enabled

    def get_visit_stats(self, org_id: ObjectId) -> List[Any]:
        pipeline = [
            {"$match": {"_id": org_id}},
            {"$unwind": {"path": "$members"}},
            {"$replaceRoot": {"newRoot": "$members"}},
            {"$project": {"netid": 1}},
            {
                "$lookup": {
                    "from": "urls",
                    "localField": "netid",
                    "foreignField": "netid",
                    "as": "links",
                }
            },
            {
                "$addFields": {
                    "total_visits": {"$sum": "$links.visits"},
                    "unique_visits": {"$sum": "$links.unique_visits"},
                }
            },
            {"$project": {"links": 0}},
        ]

        return list(self.db.organizations.aggregate(pipeline))
    
    def get_links(self, org_id: ObjectId) -> List[Any]:
        """Get all links associated with an org

        :param org_id: The org ID
        :returns: A list of links associated with the org
        """
        
        pipeline = [
            {"$match": {
                "$or": [
                    {"$and": [
                        {"owner.type": "org"},
                        {"owner._id": org_id}
                    ],
                    },
                    {"viewers._id": org_id},
                ]
            }},
            {
                "$lookup": {
                    "from": "organizations",
                    "localField": "owner._id",
                    "foreignField": "_id",
                    "as": "owner_org",
                }
            },
            {
                "$addFields": {
                    "canEdit": {
                        "$cond": {
                            "if": {
                                "$or": [
                                    {"$eq": ["$owner._id", org_id]},
                                    {"$in": [org_id, "$editors._id"]}
                                ]
                            },
                            "then": True,
                            "else": False
                        }
                    },
                    "role" : {
                        "$cond": {
                            "if": {"$eq": ["$owner._id", org_id]},
                            "then": "owner",
                            "else": {
                                "$cond": {
                                    "if": {"$in": [org_id, "$editors._id"]},
                                    "then": "editor",
                                    "else" : "viewer"
                                }
                            }
                        }
                    },
                    "owner.org_name": {
                        "$cond": [
                            {"$eq": ["$owner.type", "org"]},
                            {"$first": "$owner_org.name"},
                            "$owner._id"
                        ]
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "alias": 1,
                    "canEdit": 1,
                    "owner": 1,
                    "long_url": 1,
                    "role": 1,
                    "deleted": 1,
                }
            },  
        ]
        return list(self.db.urls.aggregate(pipeline))
    
    def get_org_overall_stats(self, org_id: ObjectId) -> List[Any]:
        """Get overall stats for an org

        :param org_id: The org ID
        :returns: A list of stats for the org
        """
        pipeline = [
            {"$match": {
                "$or": [
                    {"$and": [
                        {"owner.type": "org"},
                        {"owner._id": org_id}
                    ],
                    },
                    {"viewers._id": org_id},
                ]
            }},
            {
                "$group": {
                    "_id": None,
                    "total_links": {"$sum": 1},
                    "total_visits": {"$sum": "$visits"},
                    "unique_visits": {"$sum": "$unique_visits"},
                }
            },
            { "$project": {
                "_id": 0,
            }}
        ]
    
        results = list(self.db.urls.aggregate(pipeline))
        if not results or len(results) == 0:
            return None;
        return results[0]
        
    def get_geoip_stats(self, org_id: ObjectId) -> Any:
        def not_null(field: str) -> Any:
            return [{"$match": {field: {"$exists": True, "$ne": None}}}]

        def group_by(op: str) -> Any:
            return [{"$group": {"_id": op, "value": {"$sum": 1}}}]

        filter_us = [{"$match": {"country_code": "US"}}]

        rename_id = [
            {"$addFields": {"code": "$_id"}},
            {"$project": {"_id": 0}},
        ]

        aggregation = [
            {"$match": {"_id": org_id}},
            {"$unwind": "$members"},
            {
                "$lookup": {
                    "from": "urls",
                    "localField": "members.netid",
                    "foreignField": "netid",
                    "as": "links",
                }
            },
            {"$unwind": "$links"},
            {"$replaceRoot": {"newRoot": "$links"}},
            {
                "$lookup": {
                    "from": "visits",
                    "localField": "_id",
                    "foreignField": "link_id",
                    "as": "visits",
                }
            },
            {"$unwind": "$visits"},
            {"$replaceRoot": {"newRoot": "$visits"}},
            {
                "$facet": {
                    "us": filter_us
                    + not_null("state_code")
                    + group_by("$state_code")
                    + rename_id,
                    "world": not_null("country_code")
                    + group_by("$country_code")
                    + rename_id,
                }
            },
        ]

        return next(self.db.organizations.aggregate(aggregation))

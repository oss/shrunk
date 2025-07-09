"""Module for the user system client"""

from typing import Any, Dict, List, Optional

import pymongo
from shrunk.util.ldap import is_valid_netid, query_position_info
import datetime


from .exceptions import InvalidEntity

__all__ = ["UserClient"]


class UserClient:
    """This class implements the Shrunk user system"""

    def __init__(
        self,
        db: pymongo.database.Database,
    ):
        self.db = db

    def get_all_users(self, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get all users from the database"""

        grants_collection = self.db["grants"]

        pipeline = [
            # Step 1: Filter out blocked URLs from grants collection
            {"$match": {"role": {"$ne": "blocked_url"}}},
            # Step 2: Group by entity to get unique netids and roles
            {"$group": {"_id": "$entity", "roles": {"$addToSet": "$role"}}},
            # Step 3: Project the results to format the output
            {"$project": {"_id": 0, "netid": "$_id", "roles": 1}},
            # Step 4: Lookup to join with urls collection
            {
                "$lookup": {
                    "from": "urls",
                    "localField": "netid",
                    "foreignField": "netid",
                    "as": "links",
                }
            },
            # Step 5: Add linksCreated field
            {"$addFields": {"linksCreated": {"$size": "$links"}}},
            # Step 6: Remove the links array as it's no longer needed
            {"$project": {"links": 0}},
            # Step 7: Lookup to join with organizations collection
            {
                "$lookup": {
                    "from": "organizations",
                    "let": {"user_netid": "$netid"},
                    "pipeline": [
                        {"$unwind": "$members"},
                        {
                            "$match": {
                                "$expr": {"$eq": ["$members.netid", "$$user_netid"]}
                            }
                        },
                        {"$project": {"name": 1, "_id": 0}},
                    ],
                    "as": "organizations",
                }
            },
            # Step 8: Add organizations field
            {
                "$addFields": {
                    "organizations": {
                        "$map": {
                            "input": "$organizations",
                            "as": "org",
                            "in": "$$org.name",
                        }
                    }
                }
            },
        ]

        ops_pipeline = []
        for operation in operations:
            op_type = operation.get("type")
            op_field = operation.get("field")
            op_spec = operation.get("specification")
            op_fs = operation.get("filterString")

            if op_type == "filter":
                if op_field == "netid" and op_spec == "matches":
                    ops_pipeline.append({"$match": {op_field: op_fs}})
                elif op_field in ["organizations", "roles"] and op_spec == "contains":
                    ops_pipeline.append({"$match": {op_field: {"$in": [op_fs]}}})
                elif op_field == "linksCreated":
                    if op_spec == "lt":
                        ops_pipeline.append(
                            {"$match": {"linksCreated": {"$lt": int(op_fs)}}}
                        )
                    elif op_spec == "gt":
                        ops_pipeline.append(
                            {"$match": {"linksCreated": {"$gt": int(op_fs)}}}
                        )
                    else:
                        pass  # should never reach here
            elif op_type == "sort":
                sort_order = 1 if op_spec == "asc" else -1
                ops_pipeline.append({"$sort": {op_field: sort_order}})

        pipeline.extend(ops_pipeline)

        return [
            {
                key: doc[key]
                for key in ["netid", "roles", "linksCreated", "organizations"]
            }
            for doc in grants_collection.aggregate(pipeline)
        ]

    def get_user_system_options(self) -> Dict[str, Any]:
        """Get options related to the user system"""
        return {
            "TYPE_OPTIONS": ["filter", "sort"],
            "FIELD_STRING_OPTIONS": ["netid"],
            "FIELD_ARRAY_STRING_OPTIONS": ["organizations", "roles"],
            "FIELD_NUMBER_OPTIONS": ["linksCreated"],
            "FIELD_OPTIONS": [
                "netid",
                "organizations",
                "roles",
                "linksCreated",
            ],
            "SPECIFICATION_FILTER_STRING_OPTIONS": ["matches"],
            "SPECIFICATION_FILTER_ARRAY_STRING_OPTIONS": ["contains"],
            "SPECIFICATION_FILTER_NUMBER_OPTIONS": ["lt", "gt"],
            "SPECIFICATION_SORT_OPTIONS": ["asc", "desc"],
            "INTERNAL_TO_EXTERNAL": {
                "filter": "Filter",
                "sort": "Sort",
                "netid": "NetID",
                "organizations": "Organizations",
                "roles": "Roles",
                "linksCreated": "Links Created",
                "matches": "Matches",
                "contains": "Contains",
                "lt": "Less Than",
                "gt": "Greater Than",
                "desc": "Descending",
                "asc": "Ascending",
            },
            "FILTER_STRING_PLACEHOLDER": "Input filter string",
            "FILTER_NUMBER_PLACEHOLDER": "Input filter number",
        }

    def is_user_expired(self, entity: str) -> bool:
        """Checks whether a guest user is expired."""
        if not is_valid_netid(entity):
            raise InvalidEntity("Invalid entity provided")

        user = self.db.grants.find_one({"role": "guest", "entity": entity})
        if user is None:
            raise InvalidEntity("User is not a valid guest")

        if datetime.datetime.now() > user.get("expires_on", datetime.datetime.max):
            return True

        return False

    def is_valid_entity(self, entity: str) -> bool:
        """Check whether an entity is valid"""
        return is_valid_netid(entity)

    def get_position_info(self, entity: str) -> Dict[str, List[str]]:
        """Get the position info for a user needed to make role request
        decisions.

        :param entity: The entity to get the position info for.

        :returns Dict[str, List[str]]: The role request position info for the
        entity. It is formatted as follows:

        .. code-block:: json

        {
            "titles": List[str],
            "departments": List[str],
            "employmentTypes": List[str]
        }
        """
        position_info = query_position_info(entity)

        # LDAP queries are disabled
        if position_info is None:
            return {
                "titles": ["LDAP queries disabled"],
                "departments": ["LDAP queries disabled"],
                "employmentTypes": ["LDAP queries disabled"],
            }

        # LDAP queries are enabled
        formatted_position_info = {
            "titles": position_info.get("title", ["No titles found"]),
            "departments": position_info.get(
                "rutgersEduStaffDepartment", ["No departments found"]
            ),
            "employmentTypes": position_info.get(
                "employeeType", ["No employment types found"]
            ),
        }
        return formatted_position_info

    def initialize_user(
        self,
        netid: str,
    ) -> None:
        """Initialize a user in the database
        :param entity: The entity to initialize
        :param filterOptions: The filter options for the user
        """
        existing_user = self.db["users"].find_one({"netid": netid})
        if not existing_user:
            new_user = {
                "netid": netid,
            }
            self.db["users"].insert_one(new_user)

    def get_user_filter_options(self, netid: str) -> Dict[str, Any]:
        """Get the filter options for a user

        :param netid: The netid of the user to get the filter options for

        :returns Dict[str, Any]: The filter options for the user



        """
        user: Dict[str, Any] = self.db["users"].find_one({"netid": netid})
        if "filterOptions" not in user:
            filterOptions = {
                "show_expired_links": False,
                "show_deleted_links": False,
                "sort": {"key": "relevance", "order": "descending"},
                "showType": "links",
                "set": {"set": "user"},
                "begin_time": None,
                "end_time": None,
                "owner": None,
                "queryString": "",
            }

            self.update_user_filter_options(netid, filterOptions)
            return filterOptions
        return user["filterOptions"]

    def update_user_filter_options(
        self, netid: str, filterOptions: Dict[str, Any]
    ) -> None:
        """Update the filter options for a user

        :param netid: The netid of the user to update the filter options for
        :param filter_options: The new filter options for the user
        """

        keys = [
            "show_expired_links",
            "show_deleted_links",
            "sort",
            "showType",
            "set",
            "begin_time",
            "end_time",
            "owner",
            "queryString",
        ]
        for key in keys:
            if key not in filterOptions:
                raise ValueError(f"Missing key {key} in filterOptions")

            self.db["users"].update_one(
                {"netid": netid}, {"$set": {"filterOptions": filterOptions}}
            )

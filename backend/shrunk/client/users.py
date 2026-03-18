"""Module for the user system client"""

from typing import Any, Dict, List, Optional, Union

import pymongo
from shrunk.util.ldap import is_valid_netid, query_position_info
from datetime import datetime, timezone

from .exceptions import InvalidEntity, NoSuchObjectException

__all__ = ["UserClient"]


class UserClient:
    """This class implements the Shrunk user system"""

    def __init__(
        self,
        db: pymongo.database.Database,
    ):
        self.db = db

    def initialize_user(
        self, netid: str, role: Union[str, List[str]], grantor: Optional[str] = "system"
    ) -> None:
        """Initialize a user in the database


        :param entity: The entity to initialize
        :param role: The role to assign to the user (can be a list of roles)

        """
        existing_user = self.db["users"].find_one({"netid": netid})
        if not existing_user:
            if isinstance(role, list):
                unique_roles = list(dict.fromkeys(role))
                for r in unique_roles:
                    if not self.is_valid_role(r):
                        continue
                roles = [
                    {
                        "role": r,
                        "granted_by": grantor,
                        "comment": "",
                        "time_granted": datetime.now(timezone.utc),
                    }
                    for r in unique_roles
                ]
            else:
                roles = [
                    {
                        "role": role,
                        "granted_by": grantor,
                        "comment": "",
                        "time_granted": datetime.now(timezone.utc),
                    }
                ]
            new_user = {
                "netid": netid,
                "roles": roles,
                "date_created": datetime.now(timezone.utc),
            }
            self.db["users"].insert_one(new_user)

    def get_user(self, netid: str) -> Optional[Dict[str, Any]]:
        """Get a user from the database
        :param entity: The entity to get
        :returns: The user object if found, None otherwise
        :rtype: Optional[Dict[str, Any]]
        """

        pipeline = [
            {
                "$match": {
                    "netid": netid,
                }
            },
            {
                "$project": {
                    "netid": 1,
                    "roles": {
                        "$map": {  # only get the role name
                            "input": "$roles",
                            "as": "role",
                            "in": "$$role.role",
                        }
                    },
                    "date_created": 1,
                }
            },
            {
                "$lookup": {
                    "from": "urls",
                    "localField": "netid",
                    "foreignField": "netid",
                    "as": "links",
                }
            },
            {"$addFields": {"linksCreated": {"$size": "$links"}}},
            {"$project": {"links": 0}},
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

        user_cursor = self.db["users"].aggregate(pipeline)
        if user_cursor:
            user_data = list(user_cursor)

            if user_data:
                return {
                    "netid": user_data[0]["netid"],
                    "roles": user_data[0]["roles"],
                    "date_created": user_data[0]["date_created"],
                    "linksCreated": user_data[0]["linksCreated"],
                    "organizations": user_data[0]["organizations"],
                }
        return None

    def get_user_roles(self, netid: str) -> List[str]:
        """Get the roles for a user
        :param entity: The entity to get the roles for
        :returns: The roles for the user
        """
        user = self.db["users"].find_one({"netid": netid})
        if user:
            return [role.get("role") for role in user.get("roles", [])]
        return []

    def delete_user(self, netid: str) -> None:
        """Delete a user from the database

        :param netid: The entity to delete

        :raises NoSuchObjectException: If the user does not exist in the database
        """

        user = self.db["users"].find_one({"netid": netid})
        if not user:
            raise NoSuchObjectException(f"User {netid} does not exist in the database.")

        self.db["users"].delete_one({"netid": netid})

    def get_all_users(self, operations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get all users from the database

        :param operations: The operations to perform on the users
        :returns: The users in the database
        """

        pipeline = [
            {
                "$match": {
                    "netid": {"$exists": True},
                }
            },
            {
                "$project": {
                    "netid": 1,
                    "roles": {
                        "$map": {  # only get the role name
                            "input": "$roles",
                            "as": "role",
                            "in": "$$role.role",
                        }
                    },
                }
            },
            {
                "$lookup": {
                    "from": "urls",
                    "localField": "netid",
                    "foreignField": "owner._id",
                    "as": "links",
                }
            },
            {"$addFields": {"linksCreated": {"$size": "$links"}}},
            {"$project": {"links": 0}},
            {
                "$lookup": {
                    "from": "organizations",
                    "let": {"user_netid": "$netid"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$or": [
                                        {
                                            "$in": [
                                                "$$user_netid",
                                                {"$ifNull": ["$members.netid", []]},
                                            ]
                                        },
                                        {
                                            "$in": [
                                                "$$user_netid",
                                                {"$ifNull": ["$guests.netid", []]},
                                            ]
                                        },
                                    ]
                                }
                            }
                        },
                        {"$project": {"name": 1, "_id": 0}},
                    ],
                    "as": "organizations",
                }
            },
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

        # Apply operations to filter and sort users
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
                    filter_values = [val.strip() for val in op_fs.split(",")]
                    ops_pipeline.append({"$match": {op_field: {"$in": filter_values}}})
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

        return [
            {
                key: user[key]
                for key in ["netid", "roles", "linksCreated", "organizations"]
                if key in user
            }
            for user in self.db["users"].aggregate(pipeline)
        ]

        # Apply operations to filter and sort users

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

    def is_valid_entity(self, entity: str) -> bool:
        """Check whether an entity is valid"""
        return is_valid_netid(entity)

    def is_valid_role(self, role: str) -> bool:
        """Check whether a role is valid"""
        roles = [
            "admin",
            "power_user",
            "facstaff",
            "whitelisted",
            "blacklisted",
            "guest",
        ]
        return role in roles

    def grant_role(
        self, grantor: str, grantee: str, role: str, comment: Optional[str]
    ) -> None:
        """Grants a specific role to a user.

        Args:
            grantor (str): The netid of the user granting the role.
            grantee (str): The netid of the user receiving the role.
            role (str): The role to be granted.
            comment (Optional[str]): An optional comment about the role grant.
        Raises:
            InvalidEntity: If the role is not valid, the grantee does not exist or user already has role.
            InvalidEntity: If the grantor does not have admin privileges.
            NoSuchObjectException: If the grantee does not exist in the database.
        """

        if not self.is_valid_role(role):
            raise InvalidEntity(f"Role {role} is not valid.")

        grantee_user = self.db["users"].find_one({"netid": grantee})

        if not grantee_user:
            raise NoSuchObjectException(
                f"Grantee {grantee} does not exist in the database."
            )

        if not self.has_role(grantor, "admin"):
            raise InvalidEntity(f"Grantor {grantor} is not an admin.")

        for user_role in grantee_user.get(
            "roles", []
        ):  # check if user already has the role
            if user_role.get("role") == role:
                raise InvalidEntity(f"User {grantee} already has the role {role}.")
        self.db["users"].update_one(
            {"netid": grantee},
            {
                "$push": {
                    "roles": {
                        "role": role,
                        "granted_by": grantor,
                        "comment": comment if comment is not None else "",
                        "time_granted": datetime.now(timezone.utc),
                    }
                }
            },
        )

    def revoke_role(self, grantor: str, grantee: str, role: str) -> None:
        """Revokes a specific role from a user.

        Args:
            grantor (str): The netid of the user revoking the role.
            grantee (str): The netid of the user who's role is being revoked.
            role (str): The role to be revoked.

            Raises:
            InvalidEntity: If grantor not admin
            InvalidEntity: If the role does not exist
            InvalidEntity: If the grantee does not have the role
            NoSuchObjectException: If the grantee does not exist in the database.
            InvalidEntity: If the grantor does not have admin privileges.
        """

        if not self.is_valid_role(role):
            raise InvalidEntity(f"Role {role} is not valid.")

        if not self.has_role(grantor, "admin"):
            raise InvalidEntity(f"Grantor {grantor} does not have admin privileges.")

        grantee_user = self.db["users"].find_one({"netid": grantee})

        if not grantee_user:
            raise NoSuchObjectException(
                f"Grantee {grantee} does not exist in the database."
            )

        if not self.has_role(grantee, role):
            raise InvalidEntity(f"Grantee {grantee} does not have the role {role}.")

        self.db["users"].update_one(
            {"netid": grantee},
            {"$pull": {"roles": {"role": role}}},
        )

    def has_role(self, netid: str, role: str) -> bool:
        """Check if the user has a specific role.

        Args:
            netid (str): Netid of user to check
            role (str): Role to check for

        Returns:
            bool: True if the user has the specified role, False otherwise.
        """

        user_roles = self.get_user_roles(netid)
        for user_role in user_roles:
            if user_role == role:
                return True
        return False

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

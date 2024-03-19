"""Module for the user system client"""

from typing import List, Dict, Any

import pymongo

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
            # Step 1: Group by entity to get unique netids and roles
            {"$group": {"_id": "$entity", "roles": {"$addToSet": "$role"}}},
            # Step 2: Project the results to format the output
            {"$project": {"_id": 0, "netid": "$_id", "roles": 1}},
            # Step 3: Lookup to join with urls collection
            {
                "$lookup": {
                    "from": "urls",
                    "localField": "netid",
                    "foreignField": "netid",
                    "as": "links",
                }
            },
            # Step 4: Add linksCreated field
            {"$addFields": {"linksCreated": {"$size": "$links"}}},
            # Step 5: Remove the links array as it's no longer needed
            {"$project": {"links": 0}},
            # Step 6: Lookup to join with organizations collection
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
            # Step 7: Add organizations field
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

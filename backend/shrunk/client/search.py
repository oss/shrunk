"""Implements the :py:class:`SearchClient` class."""

from typing import Any, List
from datetime import datetime, timezone

from pymongo.collation import Collation
import pymongo

__all__ = ["SearchClient"]


class SearchClient:
    """This class executes search queries."""

    def __init__(self, *, db: pymongo.database.Database, client: Any):
        self.db = db
        self.client = client

    def execute_url(self, user_netid: str, query: Any) -> Any:  # pylint: disable=too-many-branches,too-many-statements
        """Execute a search query for shortened URLs.

        :param user_netid: The NetID of the user performing the search
        :param query: The search query. See :py:mod:`shrunk.api.search` for
          the search query format
        """

        sets = [item["set"] for item in query["set"]]

        # We're going to build up an aggregation pipeline based on the submitted query.
        pipeline: List[Any] = []

        # Independent field-based search
        search_filters = []
        exact_score_conditions = []

        if query.get("title"):
            search_filters.append({"title": {"$regex": query["title"], "$options": "i"}})
            exact_score_conditions.append({"$eq": ["$title", query["title"]]})

        if query.get("alias"):
            search_filters.append({"alias": {"$regex": query["alias"], "$options": "i"}})
            exact_score_conditions.append({"$eq": ["$alias", query["alias"]]})

        if query.get("url"):
            search_filters.append({"long_url": {"$regex": query["url"], "$options": "i"}})
            exact_score_conditions.append({"$eq": ["$long_url", query["url"]]})

        if search_filters:
            pipeline.append({"$match": {"$and": search_filters}})

            # Add optional relevance scoring
            pipeline.append(
                {
                    "$addFields": {
                        "text_search_score": {
                            "$cond": {
                                "if": {"$or": exact_score_conditions},
                                "then": 100,
                                "else": 0,
                            }
                        }
                    }
                }
            )

        set_filters = []

        if "user" in sets:
            set_filters.append({"owner._id": user_netid})

        org_ids = []
        for item in query["set"]:
            if item["set"] == "org":
                org_ids.append(item["org"])

        if org_ids:
            org_filter = {
                "$or": [
                    {"viewers": {"$elemMatch": {"_id": {"$in": org_ids}}}},
                    {
                        "$and": [
                            {"owner.type": "org"},
                            {"owner._id": {"$in": org_ids}},
                        ]
                    },
                ]
            }
            set_filters.append(org_filter)

        if "all" not in sets and set_filters:
            if len(set_filters) > 1:
                pipeline.append({"$match": {"$or": set_filters}})
            else:
                pipeline.append({"$match": set_filters[0]})

        if "shared" in sets:
            shared_pipeline = self._build_shared_pipeline(user_netid, query)

            if len(pipeline) > 0:
                pipeline.append(
                    {
                        "$unionWith": {
                            "coll": "urls",  # Query urls collection for shared
                            "pipeline": shared_pipeline,
                        }
                    }
                )
            else:
                pipeline = shared_pipeline

        # Sort results.
        sort_order = 1 if query["sort"]["order"] == "ascending" else -1
        if query["sort"]["key"] == "created_time":
            sort_key = "timeCreated"
        elif query["sort"]["key"] == "visits":
            sort_key = "visits"
        elif query["sort"]["key"] == "title":
            sort_key = "title"
            sort_order = -1 if query["sort"]["order"] == "ascending" else 1  # sort order is flipped
        elif query["sort"]["key"] == "relevance":
            sort_key = "text_search_score"
            if not any([query.get("title"), query.get("alias"), query.get("url")]):
                sort_key = "timeCreated"
        else:
            # This should never happen
            raise RuntimeError(f"Bad sort key {query['sort']['key']}")

        pipeline.append({"$sort": {sort_key: sort_order, "_id": sort_order}})

        # Add is_expired field
        now = datetime.now(timezone.utc)
        pipeline.append(
            {
                "$addFields": {
                    "is_expired": {
                        "$and": [
                            {"$toBool": "$expiration_time"},
                            {"$gte": [now, "$expiration_time"]},
                        ],
                    },
                },
            }
        )

        if not query.get("show_deleted_links", False):
            pipeline.append({"$match": {"deleted": {"$ne": True}}})

        if not query.get("show_expired_links", False):
            pipeline.append({"$match": {"is_expired": False}})

        if "begin_time" in query:
            pipeline.append({"$match": {"timeCreated": {"$gte": query["begin_time"]}}})

        if "end_time" in query:
            pipeline.append({"$match": {"timeCreated": {"$lte": query["end_time"]}}})

        if query["show_type"] == "tracking_pixels":
            pipeline.append({"$match": {"is_tracking_pixel_link": {"$exists": True, "$eq": True}}})

        if query["show_type"] == "links":
            pipeline.append(
                {
                    "$match": {
                        "$or": [
                            {"is_tracking_pixel_link": {"$eq": False}},
                            {"is_tracking_pixel_link": {"$exists": False}},
                        ]
                    }
                }
            )

        if "owner" in query and query["owner"]:
            pipeline.append({"$match": {"owner._id": query["owner"]}})

        # Pagination.
        facet = {
            "count": [{"$count": "count"}],
            "result": [{"$skip": 0}],
        }
        if "pagination" in query:
            facet["result"] = [
                {"$skip": query["pagination"]["skip"]},
                {"$limit": query["pagination"]["limit"]},
            ]
        pipeline.append({"$facet": facet})

        # Execute the query on the urls collection
        # Always use urls collection since shared pipeline also queries urls
        cursor = self.db.urls.aggregate(pipeline, collation=Collation("en"))

        def prepare_result(res: Any) -> Any:
            """Turn a result from the DB into something than can be JSON-serialized."""

            def is_alias_visible(alias: Any) -> bool:
                if query.get("show_deleted_links", False):
                    return True
                return not alias["deleted"]

            if res["owner"]["type"] == "org":
                # If the owner is an organization, get the organization name
                res["owner"]["org_name"] = self.client.orgs.get_org(res["owner"]["_id"])["name"]

            if res.get("expiration_time"):
                expiration_time = res["expiration_time"]
            else:
                expiration_time = None

            prepared = {
                "_id": res["_id"],
                "title": res["title"],
                "long_url": res["long_url"],
                "created_time": res["timeCreated"],
                "expiration_time": expiration_time,
                "visits": res["visits"],
                "domain": res.get("domain", None),
                "unique_visits": res.get("unique_visits", 0),
                "owner": res["owner"],
                "alias": res["alias"],
                "is_expired": res["is_expired"],
                "may_edit": self.client.links.may_edit(res["_id"], user_netid),
                "is_tracking_pixel_link": (res["is_tracking_pixel_link"] if "is_tracking_pixel_link" in res else False),
            }

            if res.get("deleted"):
                prepared["deletion_info"] = {
                    "deleted_by": res["deleted_by"],
                    "deleted_time": res["deleted_time"],
                }

            return prepared

        result = next(cursor)
        count = result["count"][0]["count"] if result["count"] else 0
        results = [prepare_result(res) for res in result["result"]]

        # Remove possible duplicates in results and update total count
        unique = {each["_id"]: each for each in results}.values()
        unique_results = list(unique)
        diff = len(results) - len(unique_results)
        count = count - diff

        return {
            "count": count,
            "results": unique_results,
        }

    def _build_shared_pipeline(self, user_netid: str, query: Any) -> List[Any]:
        """Build a pipeline for searching shared links.

        This pipeline finds links that are shared with the user through organizations
        they are a member of, OR links directly shared with the user.

        :param user_netid: The NetID of the user performing the search
        :param query: The search query
        :return: MongoDB aggregation pipeline stages (to be added to main pipeline)
        """
        pipeline: List[Any] = []

        orgs_cursor = self.db.organizations.find({"members.netid": user_netid}, {"_id": 1})
        org_ids = [org["_id"] for org in orgs_cursor]

        # Build filter for shared links
        shared_filter = {
            "$or": [
                {"viewers._id": user_netid},
            ]
        }

        if org_ids:
            shared_filter["$or"].append({"viewers._id": {"$in": org_ids}})
            # shared_filter["$or"].append({"owner._id": {"$in": org_ids}}) - should shared with me include links owned by orgs - Ashton?

        # Apply shared filter after search
        pipeline.append({"$match": shared_filter})

        return pipeline

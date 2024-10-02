from typing import Optional, Any, Tuple, List
from typing_extensions import Literal
from bson.objectid import ObjectId
import pymongo
import pymongo.cursor
import pymongo.results

__all__ = ["LinkHubClient"]


class LinkHubClient:
    def __init__(
        self,
        *,
        other_clients: Any,
        db: pymongo.database.Database,
        LINKHUB_ENABLED: bool,
    ) -> None:
        self.db = db
        self.other_clients = other_clients
        self.is_enabled = LINKHUB_ENABLED

    def create(
        self, title: str, owner: str, alias: Optional[str] = None
    ) -> Tuple[Any, str]:
        """Returns the inserted_id and the alias"""
        if alias is None:
            alias = self._generate_unique_key()

        document = {
            "title": title,
            "alias": alias,
            "links": [],
            "owner": owner,
            "collaborators": [],
            "is_public": False,
        }

        result = self.db.linkhubs.insert_one(document)
        return result.inserted_id, alias

    def delete(self, linkhub_id: str) -> bool:
        collection = self.db.linkhubs
        result: pymongo.results.DeleteResult = collection.delete_one(
            {"_id": ObjectId(linkhub_id)}
        )

        return result.deleted_count >= 1

    def _generate_unique_key(self) -> str:
        """Generates a unique key."""
        collection = self.db.linkhubs

        return str(collection.count())

    def _check_permission(
        self, linkhub_id: str, netid: str, permission: Literal["editors", "viewers"]
    ) -> bool:
        orgs = [
            ObjectId(org["id"]) for org in self.other_clients.orgs.get_orgs(netid, True)
        ]
        result = self.db.linkhubs.find_one(
            {
                "_id": ObjectId(linkhub_id),
                "$or": [
                    {
                        "collaborators": {
                            "$elemMatch": {
                                "_id": {"$in": orgs + [netid]},
                                "permission": permission,
                            }
                        }
                    },
                    {"owner": netid},
                ],
            }
        )

        return result is not None

    def can_edit(self, linkhub_id: str, netid: str) -> bool:
        return self._check_permission(linkhub_id, netid, "editors")

    def can_view(self, linkhub_id: str, netid: str) -> bool:
        return self._check_permission(
            linkhub_id, netid, "viewers"
        ) or self._check_permission(linkhub_id, netid, "editors")

    def get_by_alias(self, alias: str) -> Optional[Any]:
        collection = self.db.linkhubs
        result = collection.find_one({"alias": alias})
        if result is None:
            return None

        return result

    def get_by_netid(self, netid: str) -> Optional[Any]:
        collection = self.db.linkhubs
        result = collection.find_one({"owner": netid})
        if result is None:
            return None

        return result

    def get_by_id(self, document_id: str) -> Optional[Any]:
        collection = self.db.linkhubs
        result = collection.find_one({"_id": ObjectId(document_id)})
        if result is None:
            return None

        return result

    def add_link_to_linkhub(self, linkhub_id: str, title: str, url: str) -> None:
        new_link = {"title": title, "url": url}

        collection = self.db.linkhubs
        collection.update_one(
            {"_id": ObjectId(linkhub_id)}, {"$push": {"links": new_link}}
        )

    def set_data_at_link_to_linkhub(
        self, linkhub_id: str, index: int, title: str = None, url: str = None
    ) -> None:
        data = self.get_by_id(linkhub_id)
        new_links = data["links"]
        new_links[index] = {"title": title, "url": url}

        collection = self.db.linkhubs
        collection.update_one(
            {"_id": ObjectId(linkhub_id)}, {"$set": {"links": new_links}}
        )

    def change_title(self, linkhub_id: str, title: str) -> None:
        collection = self.db.linkhubs
        collection.update_one({"_id": ObjectId(linkhub_id)}, {"$set": {"title": title}})

    def change_alias(self, linkhub_id: str, alias: str) -> None:
        collection = self.db.linkhubs
        collection.update_one({"_id": ObjectId(linkhub_id)}, {"$set": {"alias": alias}})

    def set_publish_status(self, linkhub_id: str, value: bool) -> None:
        collection = self.db.linkhubs
        collection.update_one(
            {"_id": ObjectId(linkhub_id)}, {"$set": {"is_public": value}}
        )

    def delete_element_at_index(self, linkhub_id: str, index: int) -> None:
        collection = self.db.linkhubs
        collection.update_one(
            {"_id": ObjectId(linkhub_id)}, {"$unset": {f"links.{index}": ""}}
        )
        collection.update_one({"_id": ObjectId(linkhub_id)}, {"$pull": {"links": None}})

    def is_alias_valid(self, alias: str, oldAlias: Optional[str] = None) -> bool:
        if oldAlias is not None and oldAlias == alias:
            return True

        collection = self.db.linkhubs
        result = collection.find_one({"alias": str(alias)})

        return result is None

    def add_collaborator(
        self,
        linkhub_id: str,
        identifier: str,
        type: Literal["netid", "org"],
        permission: Literal["edit", "view"],
    ) -> None:
        if type == "org":
            identifier = ObjectId(identifier)

        collection = self.db.linkhubs

        if collection.find_one(
            {
                "_id": ObjectId(linkhub_id),
                "collaborators._id": identifier,
            }
        ):
            return

        collection.update_one(
            {"_id": ObjectId(linkhub_id)},
            {
                "$push": {
                    "collaborators": {
                        "_id": identifier,
                        "type": type,
                        "permission": permission,
                    }
                }
            },
        )

    def remove_collaborator(
        self, linkhub_id: str, identifier: str, type: Literal["netid", "org"]
    ) -> bool:
        """Returns True if successful"""
        if type == "org":
            identifier = ObjectId(identifier)

        collection = self.db.linkhubs

        if (
            collection.find_one(
                {
                    "_id": ObjectId(linkhub_id),
                    "collaborators._id": identifier,
                }
            )
            is None
        ):
            return False

        result = collection.update_one(
            {"_id": ObjectId(linkhub_id)},
            {
                "$pull": {
                    "collaborators": {
                        "_id": identifier,
                        "type": type,
                    }
                }
            },
        )
        return result.modified_count != 0

    def search(
        self,
        netid: Optional[str] = None,
        limit: int = 25,
        skip: int = 0,
    ) -> List[Any]:
        collection = self.db.linkhubs

        if netid is None:
            return []

        query = {"$or": [{"owner": netid}, {"collaborators._id": netid}]}
        results: pymongo.cursor.Cursor = collection.find(query, limit=limit, skip=skip)

        return list(results)

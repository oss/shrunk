from typing import Optional, Any, Tuple
from bson.objectid import ObjectId
import pymongo
import random

__all__ = ["LinkHubClient"]


class LinkHubClient:
    def __init__(self, *, db: pymongo.database.Database) -> None:
        self.db = db

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
        }

        result = self.db.linkhubs.insert_one(document)
        return result.inserted_id, alias

    @classmethod
    def _generate_unique_key(cls) -> str:
        """Generates a unique key."""

        # TODO: Make a better unique key generator
        return str(random.randint(0, 3000))

    def get_by_alias(self, alias: str) -> Optional[Any]:
        collection = self.db.linkhubs
        result = collection.find_one({"alias": alias})
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

    def delete_element_at_index(self, linkhub_id: str, index: int) -> None:
        collection = self.db.linkhubs
        collection.update_one(
            {"_id": ObjectId(linkhub_id)}, {"$unset": {f"links.{index}": ""}}
        )
        collection.update_one({"_id": ObjectId(linkhub_id)}, {"$pull": {"links": None}})

    def _is_alias_valid(self, alias: str) -> bool:
        collection = self.db.linkhubs
        result = collection.find_one({"alias": alias})

        return result is not None

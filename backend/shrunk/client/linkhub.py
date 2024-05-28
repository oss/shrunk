from typing import Optional, Any, Tuple
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

    def get_by_alias(self, alias: str) -> None:
        collection = self.db.linkhubs
        result = collection.find_one({"alias": alias})
        if result is None:
            return None

        del result["_id"]
        return result

    def add_link_to_linkhub(self, linkhub_alias: str, title: str, url: str) -> None:
        new_link = {"title": title, "url": url}

        collection = self.db.linkhubs
        collection.update_one({"alias": linkhub_alias}, {"$push": {"links": new_link}})

    def set_data_at_link_to_linkhub(
        self, linkhub_alias: str, index: int, title: str = None, url: str = None
    ) -> None:
        data = self.get_by_alias(linkhub_alias)
        new_links = data["links"]
        new_links[index] = {"title": title, "url": url}

        collection = self.db.linkhubs
        collection.update_one({"alias": linkhub_alias}, {"$set": {"links": new_links}})

    def change_title(self, linkhub_alias: str, title: str) -> None:
        collection = self.db.linkhubs
        collection.update_one({"alias": linkhub_alias}, {"$set": {"title": title}})

    def delete_element_at_index(self, linkhub_alias: str, index: int) -> None:
        collection = self.db.linkhubs
        collection.update_one(
            {"alias": linkhub_alias}, {"$unset": {f"links.{index}": ""}}
        )
        collection.update_one({"alias": linkhub_alias}, {"$pull": {"links": None}})

    def _is_url_valid(self, value: str) -> bool:
        # TODO: Implement this.

        return True

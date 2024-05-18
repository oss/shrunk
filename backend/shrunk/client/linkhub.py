from typing import Optional, Any, Tuple
import pymongo
import random

__all__ = ['LinkHubClient']

class LinkHubClient:
    def __init__(self, *, db: pymongo.database.Database) -> None:
        self.db = db

    def create(self, title: str, owner: str, alias: Optional[str] = None) -> Tuple[Any, str]:
        """Returns the inserted_id and the alias
        """
        if alias is None:
            alias = self._generate_unique_key()

        document = {
            "title": title,
            "alias": alias,
            "links": [],
            "owner": owner,
            "collaborators": []
        }
        
        result = self.db.linkhubs.insert_one(document)
        return result.inserted_id, alias

    @classmethod
    def _generate_unique_key(cls) -> str:
        """Generates a unique key."""

        return str(random.randint(0, 3000))

    def get_by_alias(self, alias) -> None:
        collection = self.db.linkhubs
        result = collection.find_one({"alias": alias})
        if result is None:
            return None

        del result['_id']
        return result

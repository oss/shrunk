from typing import List
import pymongo

__all__ = ['LinkHubClient']

class LinkHubClient:
    def __init__(self, *, db: pymongo.database.Database) -> None:
        self.db = db

    def create(self, title: str, alias: str, owners: List[str]) -> None:
        document = {
            "title": title,
            "alias": alias,
            "links": [],
            "owners": owners,
            "collaborators": []
        }
        
        result = self.db.linkhubs.insert_one(document)
        return result.inserted_id

    def get_by_alias(self, alias) -> None:
        collection = self.db.linkhubs
        result = collection.find_one({"alias": alias})
        del result['_id']
        
        return result

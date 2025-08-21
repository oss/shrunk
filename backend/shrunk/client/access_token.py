from datetime import datetime, timezone
from typing import List
from bson import ObjectId
import uuid
from argon2 import PasswordHasher
import pymongo

from .exceptions import NoSuchObjectException


class AccessTokenClient:
    def __init__(self, *, db: pymongo.database.Database):
        self.db = db
        self.ph = PasswordHasher()

        self.access_tokens_permissions = [
            "read:users",
            "read:links",
            "create:links",
            "read:tracking-pixels",
            "create:tracking-pixels",
        ]

    def create(
        self,
        organization_id: ObjectId,
        title: str,
        description: str,
        creator: str,
        permissions: List[str],
    ):
        """Currently, only organizations can have access tokens."""
        for permission in permissions:
            if permission not in self.access_tokens_permissions:
                raise Exception("Invalid permissions")

        token = uuid.uuid4()
        hashed_token = self.ph.hash(str(token))

        document = {
            "owner": organization_id,  # the organization's id
            "title": title,
            "description": description,
            "hashed_token": hashed_token,
            "created_by": creator,  # the creator's netid
            "created_date": datetime.now(timezone.utc),
            "permissions": permissions,
            "disabled": False,
            "disabled_by": None,
            "disabled_time": None,
            "deleted": False,
            "deleted_by": None,
            "deleted_time": None,
        }

        self.db.access_tokens.insert_one(document)

        return str(token)

    def get_tokens_by_owner(self, owner: ObjectId):
        """Get all access tokens for a given owner."""
        found_tokens = self.db.access_tokens.find({"owner": owner})

        tokens = []
        for token in found_tokens:
            tokens.append(
                {
                    "id": str(token["_id"]),
                    "title": token["title"],
                    "owner": str(token["owner"]),
                    "description": token["description"],
                    "created_by": token["created_by"],
                    "created_date": token["created_date"],
                    "permissions": token["permissions"],
                    "disabled": token["disabled"],
                    "disabled_by": token["disabled_by"],
                    "disabled_time": token["disabled_time"],
                    "deleted": token["deleted"],
                    "deleted_by": token["deleted_by"],
                    "deleted_time": token["deleted_time"],
                }
            )

        return tokens

    def verify_token(self, token: str) -> ObjectId:
        found_tokens = self.db.access_tokens.find({"disabled": False, "deleted": False})
        for foundToken in found_tokens:
            try:
                if self.ph.verify(foundToken["hashed_token"], token):
                    return foundToken["_id"]
            except Exception as e:
                continue
        return None

    def is_creator(self, token_id: ObjectId, netid: str) -> bool:
        result = self.db.access_tokens.find_one({"_id": token_id, "created_by": netid})
        if result is None:
            return False
        if result["created_by"] == netid:
            return True
        return False

    def delete_token(self, token_id: ObjectId, deleted_by: str) -> None:
        result = self.db.access_tokens.update_one(
            {"_id": token_id},
            {
                "$set": {
                    "deleted": True,
                    "deleted_by": deleted_by,
                    "deleted_time": datetime.now(timezone.utc),
                }
            },
        )
        if result.modified_count != 1:
            raise NoSuchObjectException

    def disable_token(self, token_id: ObjectId, disabeld_by: str) -> None:
        result = self.db.access_tokens.update_one(
            {"_id": token_id},
            {
                "$set": {
                    "disabled": True,
                    "disabled_by": disabeld_by,
                    "disabled_time": datetime.now(timezone.utc),
                }
            },
        )
        if result.modified_count != 1:
            raise NoSuchObjectException

    def check_permissions(self, token_id: ObjectId, perm: str) -> bool:
        result = self.db.access_tokens.find_one({"_id": token_id})
        if perm in result["permissions"]:
            return True
        return False

    def get_owner(self, token_id: ObjectId) -> str:
        result = self.db.access_tokens.find_one({"_id": token_id})
        return str(result["owner"])

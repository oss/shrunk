from datetime import datetime, timezone
from typing import List
from bson import ObjectId
import uuid
from argon2 import PasswordHasher
import pymongo

class AccessTokenClient:
    def __init__(self, *, db: pymongo.database.Database):
        self.db = db
        self.ph = PasswordHasher()

        self.access_tokens_permissions = [
            "read:links",
            "create:links",
            "edit:links",
            "delete:links",
            "read:tracking-pixels",
            "create:tracking-pixels",
            "edit:tracking-pixels",
            "delete:tracking-pixels",
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
            "deleted": False,
            "deleted_by": None,
        }

        self.db.access_tokens.insert_one(document)

        return str(token)

    def get_tokens_by_owner(self, owner: ObjectId):
        """Get all access tokens for a given owner."""
        tokens = self.db.access_tokens.find({"owner": owner})
        return tokens

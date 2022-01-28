"""Implements the :py:class:`OrgsClient` class."""

from datetime import datetime, timezone
from typing import Any, Optional, List, cast

from bson import ObjectId
import pymongo
import pymongo.errors

__all__ = ['OrgsClient']


class OrgsClient:
    """This class implements all orgs-related functionality."""

    def __init__(self, *, db: pymongo.database.Database):
        self.db = db

    def get_org(self, org_id: ObjectId) -> Optional[Any]:
        """Get information about a given org

        :param org_id: The org ID to query
        :returns: The Mongo document for the org, or ``None`` if no org
          exists with the provided ID
        """
        return self.db.organizations.find_one({'_id': org_id})

    def get_orgs(self, netid: str, only_member_orgs: bool) -> List[Any]:
        """Get a list of orgs

        :param netid: The NetID of the requesting user
        :param only_member_orgs: Whether or not to only return orgs of which
          the requesting user is a member
        :returns: See :py:func:`shrunk.api.org.get_orgs` for the format
          of the return value
        """
        aggregation: List[Any] = []
        if only_member_orgs:
            aggregation.append({'$match': {'members.netid': netid}})
        aggregation += [
            {
                '$addFields': {
                    'matching_admins': {
                        '$filter': {
                            'input': '$members',
                            'cond': {'$and': [
                                {'$eq': ['$$this.netid', netid]},
                                {'$eq': ['$$this.is_admin', True]},
                            ]},
                        },
                    },
                },
            },
            {
                '$addFields': {
                    'id': '$_id',
                    'is_member': {'$in': [netid, '$members.netid']},
                    'is_admin': {'$ne': [0, {'$size': '$matching_admins'}]},
                },
            },
            {'$project': {'_id': 0, 'matching_admins': 0}},
        ]
        return list(self.db.organizations.aggregate(aggregation))

    def create(self, org_name: str) -> Optional[ObjectId]:
        """Create a new org

        :param org_name: The name of the org to create
        :returns: The ID of the newly-created org, or ``None`` if an error
          occurred
        """
        try:
            result = self.db.organizations.insert_one({
                'name': org_name,
                'timeCreated': datetime.now(timezone.utc),
                'members': []})
        except pymongo.errors.DuplicateKeyError:
            return None
        return result.inserted_id

    def validate_name(self, org_name: str) -> bool:
        """Check whether a given name may be used as an org name

        :param org_name: The org name
        """
        result = self.db.organizations.find_one({'name': org_name})
        return result is None

    def rename_org(self, org_id: ObjectId, new_org_name: str) -> Optional[ObjectId]:
        """Renames an org to a new name given that the new name doesn't already exist.

        :param org_id:
        """

        matched = {'_id': org_id}
        update = {'$set': {'name': new_org_name}}

        result = self.db.organizations.update_one(matched, update)

        return cast(int, result.modified_count) == 1

    def delete(self, org_id: ObjectId) -> bool:
        """Delete an org

        :param org_id: The org ID
        :returns: Whether the org was successfully deleted
        """
        result = self.db.organizations.delete_one({'_id': org_id})
        return cast(int, result.deleted_count) == 1

    def get_members(self, org_id: ObjectId) -> List[Any]:
        return list(self.db.organizations.aggregate([
            {'$match': {'_id': org_id}},
            {'$unwind': '$members'},
            {'$replaceRoot': {'newRoot': '$members'}},
        ]))

    def create_member(self, org_id: ObjectId, netid: str, is_admin: bool = False) -> bool:
        match = {
            '_id': org_id,
            'members': {'$not': {'$elemMatch': {'netid': netid}}},
        }

        update = {
            '$addToSet': {
                'members': {
                    'netid': netid,
                    'is_admin': is_admin,
                    'timeCreated': datetime.now(timezone.utc),
                },
            },
        }

        result = self.db.organizations.update_one(match, update)
        return cast(int, result.modified_count) == 1

    def delete_member(self, org_id: ObjectId, netid: str) -> bool:
        result = self.db.organizations.update_one({'_id': org_id}, {'$pull': {'members': {'netid': netid}}})
        return cast(int, result.modified_count) == 1

    def set_member_admin(self, org_id: ObjectId, netid: str, is_admin: bool) -> bool:
        result = self.db.organizations.update_one({'_id': org_id},
                                                  {'$set': {'members.$[elem].is_admin': is_admin}},
                                                  array_filters=[{'elem.netid': netid}])
        return cast(int, result.modified_count) == 1

    def is_member(self, org_id: ObjectId, netid: str) -> bool:
        return self.db.organizations.find_one({'_id': org_id, 'members.netid': netid}) is not None

    def is_admin(self, org_id: ObjectId, netid: str) -> bool:
        result = self.db.organizations.find_one({'_id': org_id, 'members.netid': netid})
        if result is None:
            return False
        for member in result['members']:
            if member['netid'] == netid and member['is_admin']:
                return True
        return False

    def get_visit_stats(self, org_id: ObjectId) -> List[Any]:
        pipeline = [
            {'$match': {'_id': org_id}},
            {'$unwind': {'path': '$members'}},
            {'$replaceRoot': {'newRoot': '$members'}},
            {'$project': {'netid': 1}},
            {'$lookup': {'from': 'urls',
                         'localField': 'netid',
                         'foreignField': 'netid',
                         'as': 'links'}},
            {'$addFields': {'total_visits': {'$sum': '$links.visits'},
                            'unique_visits': {'$sum': '$links.unique_visits'}}},
            {'$project': {'links': 0}},
        ]

        return list(self.db.organizations.aggregate(pipeline))

    def get_geoip_stats(self, org_id: ObjectId) -> Any:
        def not_null(field: str) -> Any:
            return [{'$match': {field: {'$exists': True, '$ne': None}}}]

        def group_by(op: str) -> Any:
            return [{'$group': {'_id': op, 'value': {'$sum': 1}}}]

        filter_us = [{'$match': {'country_code': 'US'}}]

        rename_id = [
            {'$addFields': {'code': '$_id'}},
            {'$project': {'_id': 0}},
        ]

        aggregation = [
            {'$match': {'_id': org_id}},
            {'$unwind': '$members'},
            {'$lookup': {
                'from': 'urls',
                'localField': 'members.netid',
                'foreignField': 'netid',
                'as': 'links',
            }},
            {'$unwind': '$links'},
            {'$replaceRoot': {'newRoot': '$links'}},
            {'$lookup': {
                'from': 'visits',
                'localField': '_id',
                'foreignField': 'link_id',
                'as': 'visits',
            }},
            {'$unwind': '$visits'},
            {'$replaceRoot': {'newRoot': '$visits'}},
            {'$facet': {
                'us': filter_us + not_null('state_code') + group_by('$state_code') + rename_id,
                'world': not_null('country_code') + group_by('$country_code') + rename_id,
            }},
        ]

        return next(self.db.organizations.aggregate(aggregation))

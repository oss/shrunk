# shrunk - Rutgers University URL Shortener

import datetime

from pymongo.collection import ReturnDocument

from .. import roles


class OrgsClient:
    """Mixin for organization-related operations."""

    def create_organization(self, name):
        col = self.db.organizations
        rec_query = {'name': name}
        rec_insert = {'name': name, 'timeCreated': datetime.datetime.now(), 'members': []}
        res = col.find_one_and_update(rec_query, {'$setOnInsert': rec_insert}, upsert=True,
                                      return_document=ReturnDocument.BEFORE)
        # return false if organization already existed, otherwise true
        return res is None

    def delete_organization(self, name):
        self.db.organizations.delete_one({'name': name})

    def get_organization_info(self, name):
        col = self.db.organizations
        return col.find_one({'name': name})

    def is_organization_member(self, name, netid):
        col = self.db.organizations
        res = col.find_one({'name': name, 'members.netid': netid})
        return bool(res)

    def is_organization_admin(self, name, netid):
        col = self.db.organizations
        res = col.find_one({'name': name, 'members': {'$elemMatch': 
                                                      {'netid': netid, 'is_admin': True}}})
        return bool(res)

    def add_organization_member(self, name, netid, is_admin=False):
        '''returns false if user already exists'''
        col = self.db.organizations
        match = {'name': name, 'members': {'$not': {'$elemMatch': {'netid': netid}}}}
        member = {'is_admin': is_admin,
                  'netid': netid,
                  'timeCreated': datetime.datetime.now()}
        res = col.update_one(match, {'$addToSet': {'members': member}})
        return res.modified_count != 0

    def add_organization_admin(self, name, netid):
        if self.is_organization_member(name, netid):
            col = self.db.organizations
            match = {'name': name, 'members.netid': netid}
            update = {"members.$.is_admin": true}
            res = col.update_one(match, update)
            return bool(res)
        else:
            return self.add_organization_member(name, netid, is_admin=True)
            

    def remove_organization_member(self, name, netid):
        col = self.db.organizations
        res = col.update_one({'name': name}, {'$pull': {'members': {'netid': netid}}})
        return res.modified_count == 1

    def remove_organization_admin(self, name, netid):
        col = self.db.organizations
        res = col.update_one({'name': name, 'members.netid': netid},
                             {'$set': {'members.$.is_admin': False}})
        return res.modified_count == 1

    def agg_members(self, name):
        return [{'$match': {'name': name}},
                {'$unwind': '$members'},
                {'$replaceRoot': {'newRoot': '$members'}}]

    agg_admins = [{'$match': {'is_admin': True}}]

    def count_organization_members(self, name):
        return len(list(self.get_organization_members(name)))

    def get_organization_members(self, name):
        col = self.db.organizations
        return col.aggregate(self.agg_members(name))

    def count_organization_admins(self, name):
        return len(list(self.get_organization_admins(name)))
    
    def get_organization_admins(self, name):
        col = self.db.organizations
        return col.aggregate(self.agg_members(name) + self.agg_admins)

    def get_member_organizations(self, netid):
        col = self.db.organizations
        return col.find({'members.netid': netid}, projection={'members': False})

    def get_admin_organizations(self, netid):
        col = self.db.organizations
        return col.find({'members': {'$elemMatch': {'netid': netid, 'is_admin': True}}},
                        projection={'members': False})

    def may_manage_organization(self, name, netid):
        if not self.get_organization_info(name):
            return False
        if roles.check('admin', netid):
            return 'site-admin'
        if self.is_organization_admin(name, netid):
            return 'admin'
        if self.is_organization_member(name, netid):
            return 'member'
        return False

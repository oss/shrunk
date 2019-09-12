# shrunk - Rutgers University URL Shortener

import datetime

from pymongo.collection import ReturnDocument

from .. import roles


class OrgsClient:
    """Mixin for organization-related operations."""

    def create_organization(self, name):
        col = self.db.organizations
        rec_query = {'name': name}
        rec_insert = {'name': name, 'timeCreated': datetime.datetime.now()}
        res = col.find_one_and_update(rec_query, {'$setOnInsert': rec_insert}, upsert=True,
                                      return_document=ReturnDocument.BEFORE)
        # return false if organization already existed, otherwise true
        return res is None

    def delete_organization(self, name):
        with self._mongo.start_session() as s:
            s.start_transaction()
            self.db.organization_members.delete_many({'name': name})
            self.db.organizations.delete_one({'name': name})
            s.commit_transaction()

    def get_organization_info(self, name):
        col = self.db.organizations
        return col.find_one({'name': name})

    def is_organization_member(self, name, netid):
        col = self.db.organization_members
        res = col.find_one({'name': name, 'netid': netid})
        return bool(res)

    def is_organization_admin(self, name, netid):
        col = self.db.organization_members
        res = col.find_one({'name': name, 'netid': netid})
        return res['is_admin'] if res else False

    def add_organization_member(self, name, netid, is_admin=False):
        col = self.db.organization_members
        rec = {'name': name, 'netid': netid}
        rec_insert = {'name': name,
                      'is_admin': is_admin,
                      'netid': netid,
                      'timeCreated': datetime.datetime.now()}
        res = col.find_one_and_update(rec, {'$setOnInsert': rec_insert},
                                      upsert=True, return_document=ReturnDocument.BEFORE)
        return res is None

    def add_organization_admin(self, name, netid):
        self.add_organization_member(name, netid, is_admin=True)
        return True

    def remove_organization_member(self, name, netid):
        col = self.db.organization_members
        col.delete_one({'name': name, 'netid': netid})

    def remove_organization_admin(self, name, netid):
        col = self.db.organization_members
        col.update_one({'name': name, 'netid': netid}, {'$set': {'is_admin': False}})

    def count_organization_members(self, name):
        col = self.db.organization_members
        return col.count_documents({'name': name})

    def get_organization_members(self, name):
        col = self.db.organization_members
        return col.find({'name': name})

    def count_organization_admins(self, name):
        col = self.db.organization_members
        return col.count_documents({'name': name, 'is_admin': True})

    def get_organization_admins(self, name):
        col = self.db.organization_members
        return col.find({'name': name, 'is_admin': True})

    def get_member_organizations(self, netid):
        col = self.db.organization_members
        return col.find({'netid': netid})

    def get_admin_organizations(self, netid):
        col = self.db.organization_members
        return col.find({'netid': netid, 'is_admin': True})

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

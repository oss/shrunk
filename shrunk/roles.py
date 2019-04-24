from pymongo import MongoClient

#function hashes
qualified_for = {}
valid_entity_for = {}
oncreate_for = {}
form_text = {}
#mongo coll to persist the roles data
grants = None

class NotQualified(Exception):
    pass
class InvalidEntity(Exception):
    pass

def default_text(role):
    """ gives the default text that apears in a role menu"""
    return {
        "title": role,
        "invalid": "invalid entity for role " + role,
        "grant_title": "Grant " + role,
        "grant_button": "GRANT",
        "revoke_title": "Revoke " + role,
        "revoke_button": "REVOKE",
        "empty": "there is currently nothing with the role " + role,
        "granted_by": "granted by",
        "allow_comment": False
    }

def new(role, qualifier_func, validator_func=lambda e: e != "",
        custom_text={},
        oncreate=lambda e: "default"):
    """
    :Parameters:
    - `qualifier_func`: takes in a netid and returns wether or not a user is
    qualified to add to a specific role.
    - `validator func`: takes in an entity (like netid or link) and returns
    if its valid for a role. for example it could take a link like 'htp://fuz'
    and say its not a valid link
    - `custom_text`: custom text to show on the form. see default_text source for options
    - `oncreate`: callback for extra logic when granting a role. eg remove a users links on ban
    """
    text = default_text(role)
    text.update(custom_text)
    form_text[role] = text
    qualified_for[role] = qualifier_func
    valid_entity_for[role] = validator_func
    oncreate_for[role] = oncreate

def grant(role, grantor, grantee, comment=''):
    """gives a role to grantee and remembers who did it"""
    if exists(role) and valid_entity_for[role](grantee):
        #guard against double insertions
        if not check(role, grantee):
            grants.insert({
                "role": role,
                "entity": grantee,
                "granted_by": grantor,
                "comment": comment
            })
            if role in oncreate_for:
                oncreate_for[role](grantee)
    else:
        raise InvalidEntity()

def check(role, entity):
    """check if an entity has a role"""
    if grants.find_one({"role": role, "entity": entity}):
        return True
    return False

def has_one_of(roles, entity):
    """check if an entity has atleast one of the roles int the list"""
    for role in roles:
        if grants.find_one({"role": role, "entity": entity}):
            return True
    return False

def get(entity):
    """gives list of strings for all roles an entity has"""
    entity_grants = grants.find({"entity": entity})
    return [grant["role"] for grant in entity_grants]

def granted_by(role, entity):
    grant = grants.find_one({"role": role, "entity": entity})
    if not grant:
        return None
    return grant["granted_by"]

def list_all(role):
    """list all entities with the role"""
    return list(grants.find({"role": role}))

def revoke(role, entity):
    """revoke role from entity"""
    grants.remove({"role": role, "entity": entity})

def template_data(role, netid, invalid=False):
    """gets teplated data for lisiting entities with a role in the ui"""
    is_admin = check('admin', netid)
    grants = list_all(role)
    if not is_admin:
        grants = [g for g in grants if g['granted_by'] == netid]
    data = {
        "role": role,
        "grants": grants
    }
    if invalid:
        data["msg"] = form_text[role]["invalid"]
    data.update(form_text[role])
    data['admin'] = is_admin
    data['power_user'] = check("power_user", netid)
    data['facstaff'] = check("facstaff", netid)
    return data

def exists(role):
    """check if a role is valid"""
    return role in qualified_for

def valid_roles():
    """returns a list of valid roles"""
    return list(qualified_for)

def init(app, mongo_client=None):
    """init the module, namely get a reference to db"""
    if not mongo_client:
        mongo_client = app.get_shrunk()._mongo
        #this forces pymongo to connect instead of sitting on its hands and blocking
        #the server. idk why it behaves like this but if you remove the next like the
        #server does not respond. pymongo3.6 aug 2018
        mongo_client.admin.command("ismaster")
    global grants
    grants = mongo_client.shrunk_roles.grants

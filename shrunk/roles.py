from pymongo import MongoClient

#function hashes
qualified_for = {}
valid_entity_for = {}
oncreate_for = {}
form_text = {}
#mongo coll to persist the roles data
grants=None

class NotQualified(Exception):
    pass
class InvalidEntity(Exception):
    pass

def default_text(role):
    return {
        "title": role,
        "invalid": "invalid entity for role "+role,
        "grant_title": "Grant "+role,
        "grant_button": "GRANT",
        "revoke_title": "Revoke "+ role,
        "revoke_button": "REVOKE",
        "empty": "there is currently nothing with the role "+role, 
        "granted_by": "granted by"
    }

def new(role, qualifier_func, validator_func = lambda e: e!="", 
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
    text=default_text(role)
    text.update(custom_text)
    form_text[role] = text
    qualified_for[role] = qualifier_func
    valid_entity_for[role] = validator_func
    oncreate_for[role] = oncreate
    


def grant(role, grantor, grantee, force=False):
    if not qualified_for[role](grantor) and not force:
        raise NotQualified()
    if not valid_entity_for[role](grantee):
        raise InvalidEntity()
    
    grants.insert({"role": role, "entity": grantee, "granted_by": grantor})
        
def check(role, entity):
    if grants.find_one({"role": role, "entity": entity}):
        return True
    return False

def list_all(role):
    return list(grants.find({"role": role}))

def revoke(role, revoker, revokee):
    if not qualified_for[role](revoker):
        raise NotQualified()
    grants.remove({"role": role, "entity": revokee})

def template_data(role, invalid=False):
    data = {
        "role": role,
        "grants": list_all(role)
    }
    if invalid:
        data["msg"] = form_text[role]["invalid"]
    data.update(form_text[role])
    return data

def exists(role):
    return role in qualified_for
        
def init(app, mongo_client=None):
    if not mongo_client:
        mongo_client = MongoClient(app.config["DB_HOST"], app.config["DB_PORT"])
        #this forces pymongo to connect instead of sitting on its hands and blocking
        #the server. idk why it behaves like this but if you remove the next like the
        #server does not respond. pymongo3.6 aug 2018
        mongo_client.admin.command("ismaster")
    global grants
    grants = mongo_client.shrunk_roles.grants
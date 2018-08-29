from pymongo import MongoClient
from shrunk.util import require_login
from functools import wraps
from flask import session, redirect, render_template, url_for, request

#hash of qualifier functions to see if user is allowed to give new entities that role
qualified_for = {}
valid_entity_for = {}
form_text = {}
#mongo coll to persist the roles data
roles=None

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

def new(role, qualifier_func, validator_func = lambda e: e!="", custom_text={}):
    """
    :Parameters:
    - `qualifier_func`: takes in a netid and returns wether or not a user is 
    qualified to add to a specific role.
    - `validator func`: takes in an entity (like netid or link) and returns 
    if its valid for a role. for example it could take a link like 'htp://fuz' 
    and say its not a valid link
    - `custom_text`: custom text to show on the form
    """
    text=default_text(role)
    text.update(custom_text)
    form_text[role] = text
    qualified_for[role] = qualifier_func
    valid_entity_for[role] = validator_func
    


def grant(role, grantor, grantee):
    if not qualified_for[role](grantor):
        raise NotQualified()
    if not valid_entity_for[role](grantee):
        raise InvalidEntity()
    roles.insert({"role": role, "entity": grantee, "granted_by": grantor})
        
def check(role, entity):
    if roles.find({"role": role, "entity": entity}):
        return True
    return False

def list_all(role, lister):
    if not qualified_for[role](lister):
        raise NotQualified()
    return list(roles.find({"role": role}))

def revoke(role, revoker, revokee):
    if not qualified_for[role](revoker):
        raise NotQualified()
    roles.remove({"role": role, "entity": revokee})

def require_qualified(func):
    @wraps(func)
    def wrapper(role, *args, **kwargs):
        if role not in qualified_for:
            return redirect("/")
        if qualified_for[role](session["user"]["netid"]):
            new_args=[role]+list(args)
            return func(*new_args, **kwargs)
        else:
            print("not qualified", session["user"])
            return redirect("/")
    return wrapper
        


def init(app, mongo_client = None):
    if not mongo_client:
        mongo_client = MongoClient(app.config["DB_HOST"], app.config["DB_PORT"])
        #this forces pymongo to connect instead of sitting on its hands and blocking
        #the server. idk why it behaves like this but if you remove the next like the
        #server does not respond. pymongo3.6 aug 2018
        mongo_client.admin.command("ismaster")
    global roles
    roles = mongo_client.shrunk_roles.roles
    
    #handlers
    @app.route("/roles/<role>/", methods=["POST"])
    @require_login(app)
    @require_qualified
    def role_grant(role):
        try:
            netid = session["user"]["netid"]
            entity = request.form["entity"]
            grant(role, netid, entity)
            return redirect("/roles/"+role)
        except InvalidEntity:
            return render_template("role.html", role = role,
                                   grants = list_all(role, session["user"]["netid"]),
                                   msg = form_text[role]["invalid"],
                                   **form_text[role])

    @app.route("/roles/<role>/revoke", methods=["POST"])
    @require_login(app)
    @require_qualified
    def role_revoke(role):
        netid = session["user"]["netid"]
        entity = request.form["entity"]
        revoke(role, netid, entity)
        print(entity)
        return redirect("/roles/"+role)

    @app.route("/roles/<role>/", methods=["GET"])
    @require_login(app)
    @require_qualified
    def role_list(role):
        print(form_text)
        return render_template("role.html", role = role,
                               grants = list_all(role, session["user"]["netid"]),
                               **form_text[role])

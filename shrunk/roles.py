from pymongo import MongoClient
from shrunk.util import require_login
from functools import wraps, partial
from flask import session, redirect, render_template, url_for, request
import validators

#hash of qualifier functions to see if user is allowed to give new entities that role
qualified_for = {}
valid_entity_for = {}
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

def list_all(role, lister):
    if not qualified_for[role](lister):
        raise NotQualified()
    return list(grants.find({"role": role}))

def revoke(role, revoker, revokee):
    if not qualified_for[role](revoker):
        raise NotQualified()
    grants.remove({"role": role, "entity": revokee})

def require_qualified(func):
    @wraps(func)
    def wrapper(role, *args, **kwargs):
        if role not in qualified_for:
            return redirect("/")
        if qualified_for[role](session["user"]["netid"]):
            new_args=[role]+list(args)
            return func(*new_args, **kwargs)
        else:
            return redirect("/")
    return wrapper

def require(role):
    """
    force a somone to have a role to see an enpoint
    @app.route("/my/secret/route")
    @roles.require("cool_person")
    def secret_route():
       return "top secret stuff"
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if role not in qualified_for:
                return redirect("/")
            if qualified_for[role](session["user"]["netid"]):
                return func(*args, **kwargs)
            else:
                return redirect("/")
        return wrapper
    return decotrator
        


def init(app, mongo_client = None):
    if not mongo_client:
        mongo_client = MongoClient(app.config["DB_HOST"], app.config["DB_PORT"])
        #this forces pymongo to connect instead of sitting on its hands and blocking
        #the server. idk why it behaves like this but if you remove the next like the
        #server does not respond. pymongo3.6 aug 2018
        mongo_client.admin.command("ismaster")
    global grants
    grants = mongo_client.shrunk_roles.grants
    
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
        return redirect("/roles/"+role)

    @app.route("/roles/<role>/", methods=["GET"])
    @require_login(app)
    @require_qualified
    def role_list(role):
        return render_template("role.html", role = role,
                               grants = list_all(role, session["user"]["netid"]),
                               **form_text[role])

    #setup roles
    is_admin=partial(check, "admin")
    new("admin", is_admin, custom_text = {"title": "Admins"})
    new("power_user", is_admin, custom_text = {"title": "Power Users"})
    new("blacklisted", is_admin, custom_text = {
        "title": "Blacklisted Users",
        "grant_title": "Blacklist a user:",
        "grant_button": "BLACKLIST",
        "revoke_title": "Unblacklist a user",
        "revoke_button": "UNBLACKLIST",
        "empty": "there are currently no blacklisted users", 
        "granted_by": "blacklisted by"
        
    })
    new("blocked_url", is_admin, validators.url, custom_text = {
        "title": "Blocked urls",
        "invalid": "bad url",
        "grant_title": "Block a url:",
        "grant_button": "BLOCK",
        "revoke_title": "Unblock a url",
        "revoke_button": "UNBLOCK",
        "empty": "there are currently no blocked urls", 
        "granted_by": "blocked by"
    })


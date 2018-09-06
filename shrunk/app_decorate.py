from functools import wraps, partial
from flask import session, redirect, render_template, url_for, request
import validators
import shrunk.roles as roles

def require_qualified(func):
    @wraps(func)
    def wrapper(role, *args, **kwargs):
        if not roles.exists(role):
            return redirect("/")
        if roles.qualified_for[role](session["user"]["netid"]):
            new_args=[role]+list(args)
            return func(*new_args, **kwargs)
        else:
            return redirect("/unauthorized")
    return wrapper

def require_role(role):
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
            if not roles.exists(role):
                return redirect("/")
            if roles.qualified_for[role](session["user"]["netid"]):
                return func(*args, **kwargs)
            else:
                return redirect("/unauthorized")
        return wrapper
    return decorator

#decorator to check if user is logged in
#it looks like its double wrapped but thats so it can be a decorator that takes in params
def require_login(app):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not 'user' in session:
                return redirect("/shrunk-login")
            if roles.check("blacklisted", session["user"].get("netid")):
                return redirect("/unauthorized")
            return func(*args, **kwargs)
        return wrapper
    return decorate

#decorator to check if user is an admin
#it looks like its double wrapped but thats so it can be a decorator that takes in params
def require_admin(app):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client = app.get_shrunk()
            netid = session["user"].get("netid")
            if roles.check("blacklisted", netid):
                return redirect("/unauthorized")
            if not roles.check("admin", netid):
                return redirect("/")
            return func(*args, **kwargs)
        return wrapper
    return decorate

def add_decorators(app):
    app.require_qualified = require_qualified
    app.require_role = require_role
    app.require_login = require_login(app)
    app.require_admin = require_admin(app)

def add_roles_routes(app):
    
    #handlers
    @app.route("/roles/<role>/", methods=["POST"])
    @require_login(app)
    @require_qualified
    def role_grant(role):
        try:
            netid = session["user"]["netid"]
            entity = request.form["entity"]
            roles.grant(role, netid, entity)
            return redirect("/roles/"+role)
        except roles.InvalidEntity:
            return render_template("role.html", **roles.template_data(role, invalid=True))

    @app.route("/roles/<role>/revoke", methods=["POST"])
    @require_login(app)
    @require_qualified
    def role_revoke(role):
        netid = session["user"]["netid"]
        entity = request.form["entity"]
        roles.revoke(role, entity)
        return redirect("/roles/"+role)

    @app.route("/roles/<role>/", methods=["GET"])
    @require_login(app)
    @require_qualified
    def role_list(role):
        return render_template("role.html", **roles.template_data(role))

    #setup roles
    is_admin=partial(roles.check, "admin")
    roles.new("admin", is_admin, custom_text = {"title": "Admins"})
    roles.new("power_user", is_admin, custom_text = {"title": "Power Users"})
    roles.new("blacklisted", is_admin, custom_text = {
        "title": "Blacklisted Users",
        "grant_title": "Blacklist a user:",
        "grant_button": "BLACKLIST",
        "revoke_title": "Unblacklist a user",
        "revoke_button": "UNBLACKLIST",
        "empty": "there are currently no blacklisted users", 
        "granted_by": "blacklisted by"
        
    })
    def onblock(url):
        mongo_client.urls.remove({"long_url": {"$regex": "%s*" % util.get_domain(url)}})
    roles.new("blocked_url", is_admin, validators.url, custom_text = {
        "title": "Blocked urls",
        "invalid": "bad url",
        "grant_title": "Block a url:",
        "grant_button": "BLOCK",
        "revoke_title": "Unblock a url",
        "revoke_button": "UNBLOCK",
        "empty": "there are currently no blocked urls", 
        "granted_by": "blocked by"
    }, oncreate = onblock)

from functools import wraps, partial
import logging
from flask import Flask, session, redirect, render_template, request
from shrunk.stringutil import validate_url
import shrunk.roles as roles
from shrunk.client import ShrunkClient
from shrunk.stringutil import get_domain

class ShrunkFlaskMini(Flask):
    """set up and configs our basic shrunk aplication"""
    def __init__(self, name):
        super(ShrunkFlaskMini, self).__init__(name)
        # Import settings in config.py
        self.config.from_pyfile("config.py", silent = True)
        self.secret_key = self.config['SECRET_KEY']

        # Initialize logging
        self.set_logger()
        self.logger.info("logging started")

        self._shrunk_client = ShrunkClient(self.config["DB_HOST"], 
                                           self.config["DB_PORT"],
                                           geolite_path=self.config.get("GEOLITE_PATH"))
        self.logger.info("ShrunkClient initialized %s:%s"
                         % (self.config["DB_HOST"],
                            self.config["DB_PORT"]))

    def set_logger(self):
        """Sets a logger with standard settings.

        :Parameters:
          - `app`: A Flask application object.
        """
        handler = logging.FileHandler(self.config["LOG_FILENAME"])
        handler.setLevel(logging.INFO)
        handler.setFormatter(logging.Formatter(self.config["LOG_FORMAT"]))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def get_shrunk(self):
        return self._shrunk_client

class ShrunkFlask(ShrunkFlaskMini):
    """also sets up roles system for administration panel"""
    def __init__(self, name):
        super(ShrunkFlask, self).__init__(name)
        roles.init(self)
        self.logger.info("roles initialized")

        self.add_roles_routes()
        self.setup_roles()
        self.logger.info("done with setup")

    def require_qualified(self, func):
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

    def require_role(self, role):
        """force a somone to have a role to see an enpoint
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

    def require_login(self, func):
        """decorator to check if user is logged in"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not 'user' in session:
                return redirect("/shrunk-login")
            if roles.check("blacklisted", session["user"].get("netid")):
                return redirect("/unauthorized")
            return func(*args, **kwargs)
        return wrapper

    def require_admin(self, func):
        """decorator to check if user is an admin"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            netid = session["user"].get("netid")
            if roles.check("blacklisted", netid):
                return redirect("/unauthorized")
            if not roles.check("admin", netid):
                return redirect("/")
            return func(*args, **kwargs)
        return wrapper

    def add_roles_routes(self):
        """adds dynamic roles routes"""
        @self.route("/roles/<role>/", methods=["POST"])
        @self.require_login
        @self.require_qualified
        def role_grant(role):
            try:
                netid = session["user"]["netid"]
                entity = request.form["entity"]
                roles.grant(role, netid, entity)
                return redirect("/roles/"+role)
            except roles.InvalidEntity:
                return render_template("role.html", **roles.template_data(role, invalid=True))

        @self.route("/roles/<role>/revoke", methods=["POST"])
        @self.require_login
        @self.require_qualified
        def role_revoke(role):
            entity = request.form["entity"]
            roles.revoke(role, entity)
            return redirect("/roles/"+role)

        @self.route("/roles/<role>/", methods=["GET"])
        @self.require_login
        @self.require_qualified
        def role_list(role):
            return render_template("role.html", **roles.template_data(role))

    def setup_roles(self):
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
            domain = get_domain(url)
            self.logger.info(url+" is blocked! "+
                             "removing all urls with domain "+domain)
            urls = self.get_shrunk()._mongo.shrunk_urls.urls
            contains_domain = list(urls.find({"long_url": {
                # . needs to be escaped in the domain because it is regex wildcard
                "$regex": "%s*" % domain.replace(".", "\.")
            }}))

            matches_domain = [link for link in contains_domain
                          if get_domain(link["long_url"]) == domain]
            # print 3 to a line
            logmessage = "FOUND:\n"
            for link in matches_domain:
                logmessage += str(link["long_url"].encode("utf-8")) + "\n"
            self.logger.info(logmessage)

            result = urls.delete_many({
                "_id": {"$in": [doc["_id"] for doc in matches_domain]}
            })
            self.logger.info("block "+url+" result: "+str(result.raw_result))
        roles.new("blocked_url", is_admin, validate_url, custom_text = {
            "title": "Blocked urls",
            "invalid": "bad url",
            "grant_title": "Block a url:",
            "grant_button": "BLOCK",
            "revoke_title": "Unblock a url",
            "revoke_button": "UNBLOCK",
            "empty": "there are currently no blocked urls", 
            "granted_by": "blocked by"
        }, oncreate = onblock)

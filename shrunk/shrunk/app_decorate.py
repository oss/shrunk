import logging
from functools import wraps, partial

from flask import Flask, session, redirect, request, render_template

from . import roles
from .client import ShrunkClient
from .util.string import validate_url, get_domain


try:
    from uwsgidecorators import postfork
except ImportError:
    def postfork(func):
        pass


class ShrunkFlaskMini(Flask):
    """set up and configs our basic shrunk aplication"""

    def __init__(self, name):
        super(ShrunkFlaskMini, self).__init__(name)

        self.initialized = False
        
        # Import settings in config.py
        self.config.from_pyfile("config.py", silent=True)
        self.secret_key = self.config["SECRET_KEY"]

        # Initialize logging
        self.set_logger()
        self.logger.info("logging started")

        # forward urls
        @self.route("/<short_url>")
        def redirect_link(short_url):
            """Redirects to the short URL's true destination.

            This looks up the short URL's destination in the database and performs a
            redirect, logging some information at the same time. If no such link
            exists, a not found page is shown.

            :Parameters:
              - `short_url`: A string containing a shrunk-ified URL.
            """
            client = self.get_shrunk()
            self.logger.info("{} requests {}".format(request.remote_addr, short_url))

            # Perform a lookup and redirect
            long_url = client.get_long_url(short_url)
            if long_url is None:
                return render_template("link-404.html", short_url=short_url)
            else:
                client.visit(short_url, request.remote_addr,
                             request.headers.get("User-Agent"),
                             request.headers.get("Referer"))
                # Check if a protocol exists
                if "://" in long_url:
                    return redirect(long_url)
                else:
                    return redirect("http://{}".format(long_url))

    def initialize(self, *args, **kwargs):
        if self.initialized:
            return
        self.initialized = True
        self.logger.info('ShrunkFlaskMini.initialize')
        self._shrunk_client = ShrunkClient(**self.config)

        @postfork
        def reconnect():
            """
            mongoclient is not fork safe. this is used to create a new client
            after potentially forking
            """
            self._shrunk_client.reconnect()

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
        """returns the shrunk client attached to this server"""
        return self._shrunk_client


class ShrunkFlask(ShrunkFlaskMini):
    """also sets up roles system for administration panel"""

    def __init__(self, name):
        super(ShrunkFlask, self).__init__(name)
        self.logger.info('ShrunkFlask.__init__')

    def initialize(self, *args, **kwargs):
        self.logger.info('ShrunkFlask.initialize')
        if self.initialized:
            return
        super().initialize(*args, **kwargs)
        roles.init(self)
        self.logger.info('roles initialized')
        self.add_roles_routes()
        self.setup_roles()
        self.logger.info('done with setup')
        @postfork
        def reinit():
            roles.init(self)

    def switch_db(self, db_name):
        self._shrunk_client._switch_db(db_name)
        roles.init(self, db_name=db_name)

    def require_qualified(self, func):
        """
        if user is not qualified to add an entity to a role then
        redirect to unauthorized
        """
        @wraps(func)
        def wrapper(role, *args, **kwargs):
            if not roles.exists(role):
                return redirect("/")
            if roles.qualified_for[role](session["user"]["netid"]):
                new_args = [role] + list(args)
                return func(*new_args, **kwargs)
            else:
                return redirect("/unauthorized")
        return wrapper

    def require_role(self, role):
        """force a somone to have a role to see an endpoint
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
            if "user" not in session:
                return redirect("/shrunk-login")
            if roles.check("blacklisted", session["user"].get("netid")):
                return redirect("/unauthorized")
            netid = session['user']['netid']
            client = self.get_shrunk()
            return func(netid, client, *args, **kwargs)
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
        @self.require_qualified
        @self.require_login
        def role_grant(netid, client, role):
            netid = session["user"]["netid"]
            try:
                entity = request.form["entity"]
                if roles.check(role, entity):
                    kwargs = roles.template_data(role, netid)
                    kwargs['error'] = 'Role already granted.'
                    return render_template("role.html", **kwargs)
                allow_comment = roles.template_data(role, netid)['allow_comment']
                comment = ''
                if allow_comment:
                    comment = request.form["comment"]
                roles.grant(role, netid, entity, comment)
                return redirect("/roles/"+role)
            except roles.InvalidEntity:
                return render_template("role.html",
                                       **roles.template_data(role, netid, invalid=True))

        @self.route("/roles/<role>/revoke", methods=["POST"])
        @self.require_qualified
        @self.require_login
        def role_revoke(netid, client, role):
            netid = session["user"]["netid"]
            entity = request.form["entity"]
            granted_by = roles.granted_by(role, entity)
            if granted_by and (roles.check("admin", netid) or netid == granted_by):
                roles.revoke(role, entity)
                return redirect("/roles/"+role)
            return redirect("/unauthorized")

        @self.route("/roles/<role>/", methods=["GET"])
        @self.require_qualified
        @self.require_login
        def role_list(netid, client, role):
            netid = session['user'].get('netid')
            kwargs = roles.template_data(role, netid)
            return render_template("role.html", **kwargs)

    def setup_roles(self):
        """
        initialize the roles admin, power_user, blocked, facstaff, whitelisted and blacklisted
        the difference between blacklisted and blocked is that blacklisted
        refers to users where blocked refers to links
        """
        is_admin = partial(roles.check, "admin")
        roles.new("admin", is_admin, custom_text={"title": "Admins"})
        roles.new("power_user", is_admin, custom_text={
            "title": "Power Users",
            "grant_title": "Grant power user",
            "revoke_title": "Revoke power user"
        })
        roles.new("blacklisted", is_admin, custom_text={
            "title": "Blacklisted Users",
            "grant_title": "Blacklist a user:",
            "grant_button": "BLACKLIST",
            "revoke_title": "Unblacklist a user",
            "revoke_button": "UNBLACKLIST",
            "empty": "There are currently no blacklisted users",
            "granted_by": "blacklisted by"
        })

        def onblock(url):
            domain = get_domain(url)
            self.logger.info(url+" is blocked! " +
                             "removing all urls with domain "+domain)
            urls = self.get_shrunk()._mongo.shrunk_urls.urls
            contains_domain = list(urls.find({"long_url": {
                # . needs to be escaped in the domain because it is regex wildcard
                "$regex": "%s*" % domain.replace(".", r"\.")
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

        roles.new("blocked_url", is_admin, validate_url, custom_text={
            "title": "Blocked URLs",
            "invalid": "Bad URL",
            "grant_title": "Block a URL:",
            "grant_button": "BLOCK",
            "revoke_title": "Unblock a URL",
            "revoke_button": "UNBLOCK",
            "empty": "There are currently no blocked URLs",
            "granted_by": "Blocked by"
        }, oncreate=onblock)

        def admin_facstaff_or_power(netid):
            return is_admin(netid) or roles.check("facstaff", netid) \
                or roles.check("power_user", netid)

        roles.new("whitelisted", admin_facstaff_or_power, custom_text={
            "title": "Whitelisted users",
            "grant_title": "Whitelist a user",
            "grant_button": "WHITELIST",
            "revoke_title": "Remove a user from the whitelist",
            "revoke_button": "UNWHITELIST",
            "empty": "You have not whitelisted any users",
            "granted_by": "Whitelisted by",
            "allow_comment": True,
            "comment_prompt": "Describe why the user has been granted access to Go."
        })

        roles.new("facstaff", is_admin, custom_text={
            "title": "Faculty or Staff Member"
        })
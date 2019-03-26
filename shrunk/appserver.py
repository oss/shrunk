""" shrunk - Rutgers University URL Shortener

Sets up a Flask application for the main web server.
"""
from flask import (Flask, render_template, make_response, request, redirect, 
                   g, jsonify, abort)
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_auth import Auth
from flask_restful import Resource, Api, reqparse
from shrunk.linkserver import redirect_link
from shrunk.user import admin_required, elevated_required, User, get_user
from shrunk.util import set_logger, formattime, gen_qr, db_to_response_dict
from shrunk.forms import RULoginForm, UserForm
from shrunk.filters import strip_protocol, ensure_protocol
import shrunk.client as client
import shrunk.models as models
from mongoengine import connect, DoesNotExist
import json

# Create application
global app
app = Flask(__name__)
api = Api(app)

# Import settings in config.py
app.config.from_pyfile("config.py", silent=True)
app.secret_key = app.config['SECRET_KEY']

# Initialize logging
set_logger(app)

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = '/login'

# Allows us to use the function in our templates
app.jinja_env.globals.update(formattime=formattime)

# Connect to mongo
if app.config["DB_REPL"] != "":
    connect(app.config["DB_DATABASE"], host=app.config["DB_HOST"], 
            port=app.config["DB_PORT"], replicaset=app.config["DB_REPL"])
else:
    connect(app.config["DB_DATABASE"], host=app.config["DB_HOST"], 
            port=app.config["DB_PORT"])


@login_manager.user_loader
def load_user(userid):
    """Loads user object for login.

    :Parameters:
      - `userid`: An id for the user (typically a NetID).
    """
    return User(userid)


def render_login(**kwargs):
    """Renders the login template.

    Takes a WTForm in the keyword arguments.
    """
    return render_template('login.html', **kwargs)


def login_success(user):
    """Function executed on successful login.

    Redirects the user to the homepage.

    :Parameters:
      - `user`: The user that has logged in.
    """
    app.logger.info("{}: login".format(user.netid))
    return redirect('/')


def unauthorized_admin():
    return {"message": "You do not have permission to do that."}, 403


### Views ###
try:
    if app.config["DUAL_SERVER"]:
        app.add_url_rule('/<short_url>', view_func=redirect_link)
except KeyError:
    # No setting in the config file
    pass

@app.route("/")
def render_index(**kwargs):
    if not hasattr(current_user, "netid"):
        # Anonymous user
        return redirect("/login")

    # Add user if it does not exist
    try:
        user = models.User.objects.get(netid=current_user.netid)
    except DoesNotExist:
        user = models.User(netid=current_user.netid)
        user.save()

    return render_template("index.html", netid=current_user.netid)


@app.route("/login", methods=['GET', 'POST'])
def login():
    """Handles authentication."""
    a = Auth(app.config['AUTH'], get_user)
    return a.login(request, RULoginForm, render_login, login_success)


class BannedDomainsListAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def get(self):
        blocked_links = models.BlockedDomain.objects 
        return db_to_response_dict(blocked_links), 200


class BannedDomainsAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def put(self, url):
        try:
            block = models.BlockedDomain.objects.get(url=url)
        except DoesNotExist:
            user = models.User.objects.get(netid=current_user.netid)
            block = models.BlockedDomain(url=url, added_by=user)
            block.save()
        return {'data': {}}, 200

    def delete(self, url):
        try:
            block = models.BlockedDomain.objects.get(url=url)
            block.delete()
        except DoesNotExist:
            return {}, 404


class UsersListAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def get(self):
        return db_to_response_dict(models.User.objects), 200


class UsersAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('type', type=int, required=False,
                                   choices=(0, 10, 20), location="json",
                                   help="Error: {error_msg}")
        self.reqparse.add_argument('is_blacklisted', type=bool, required=False,
                                   help="Error: {error_msg}", location="json")
        super(UsersAPI, self).__init__()

    def put(self, netid):
        args = self.reqparse.parse_args()
        user = models.User.objects.get(netid=netid)

        if args['type'] is not None:
            user.type = int(args['type'])  # TODO: error checking for type val

        if args['is_blacklisted'] is not None:
            user.is_blacklisted = bool(args['is_blacklisted'])

        user.save()
        return {'data': {}}, 200


class UserUrlsAPI(Resource):
    decorators = [login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('title', type=str, required=True,
                                   location="json", help="Error: {error_msg}")
        self.reqparse.add_argument('long_url', type=str, required=True,
                                   help="Error: {error_msg}", location="json")
        self.reqparse.add_argument('alias', type=str, required=False,
                                   location="json")
        super(UserUrlsAPI, self).__init__()

    def get(self, netid):
        """ For GET there are no arguments, so we do not call parse_args()
        and therefore the Required args will not have to be supplied """
        user = models.User.objects.get(netid=netid)
        urls = models.Url.objects(user=user)
 
        # Generate QR codes
        for url in urls:
            url.qr_code = "data:image/png;base64," + gen_qr(app, url.user)

        return db_to_response_dict(urls), 200

    def post(self, netid):
        args = self.reqparse.parse_args()

        dbuser = models.User.objects.get(netid=netid)
        flaskuser = User(netid)

        long_url = args['long_url']
        title = args['title']
        alias = args['alias']

        if client.is_blocked(long_url):
            return {"message": {"url": "Banned url"}}, 403  # 403 FORBIDDEN

        if alias is not None:
            if flaskuser.is_elevated():
                # TODO: error checking and validation
                url = models.Url(long_url=long_url, user=dbuser, title=title, 
                                 short_url=alias)
                url.save()
                return {"data": {}}, 200
            else:
                return {"message": {"alias": "You do not have permission to use aliases."}}, 403  # 403 FORBIDDEN
        else:
            # TODO: error checking and validation
            url = models.Url(long_url=long_url, user=dbuser, title=title,
                             short_url=client.generate_unique_key())
            url.save()
            return {"data": {}}, 200


class UrlsListAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def get(self):
        urls = models.Url.objects

        # Generate QR codes
        for url in urls:
            url.qr_code = "data:image/png;base64," + gen_qr(app, url.user)

        return db_to_response_dict(urls), 200


class UrlsAPI(Resource):
    decorators = [login_required]

    def delete(self, id):
        try:
            link = models.Url.objects.get(short_url=id)
            user = models.User.objects.get(netid=current_user.netid)
            if user.netid != link.user.netid or not current_user.is_admin():
                return {}, 403  # 403 FORBIDDEN
            link.delete()
            return {}, 200
        except DoesNotExist:
            return {}, 404


class UrlStatsAPI(Resource):
    def get(self, id):
        abort(501)  # not yet implemented


api.add_resource(BannedDomainsListAPI,  '/api/banned_domains')
api.add_resource(BannedDomainsAPI,      '/api/banned_domains/<string:url>')
api.add_resource(UsersListAPI,          '/api/users')
api.add_resource(UsersAPI,              '/api/users/<string:netid>')
api.add_resource(UserUrlsAPI,           '/api/users/<string:netid>/urls')
api.add_resource(UrlsListAPI,           '/api/urls')
api.add_resource(UrlsAPI,               '/api/urls/<string:id>')
api.add_resource(UrlStatsAPI,           '/api/urls/<string:id>/stats')

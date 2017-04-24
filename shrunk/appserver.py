""" shrunk - Rutgers University URL Shortener

Sets up a Flask application for the main web server.
"""
from flask import (Flask, render_template, make_response, request, redirect, 
                   g, jsonify, abort)
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_auth import Auth
from flask_restful import Resource, Api, reqparse
from shrunk.forms import BlockLinksForm, LinkForm, RULoginForm, BlacklistUserForm, UserForm
from shrunk.user import User, get_user, admin_required, elevated_required
from shrunk.util import get_db_client, set_logger, formattime, gen_qr
from shrunk.filters import strip_protocol, ensure_protocol

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
    abort(403)  # 403 FORBIDDEN


### Views ###
try:
    if app.config["DUAL_SERVER"]:
        @app.route("/<short_url>")
        def redirect_link(short_url):
            """Redirects to the short URL's true destination.

            This looks up the short URL's destination in the database and
            performs a redirect, logging some information at the same time. 
            If no such link exists, a not found page is shown.

            :Parameters:
              - `short_url`: A string containing a shrunk-ified URL.
            """
            client = get_db_client(app, g)
            if client is None:
                app.logger.critical("{}: database connection failure".format(
                    current_user.netid))
                return render_template("/error.html")

            app.logger.info("{} short_url request '{}'".format(
                request.remote_addr, short_url))

            # Perform a lookup and redirect
            long_url = client.get_long_url(short_url)
            if long_url is None:
                return render_template("link-404.html", short_url=short_url)
            else:
                client.visit(short_url, request.remote_addr)
                app.logger.info("{} short_url visit '{}'".format(
                    request.remote_addr, short_url))
                # Check if a protocol exists
                if "://" in long_url:
                    return redirect(long_url)
                else:
                    return redirect("http://{}".format(long_url))
except KeyError:
    # No setting in the config file
    pass


@app.route("/")
def render_index(**kwargs):
    """Renders the homepage.

    Renders the homepage for the current user. By default, this renders all of
    the links owned by them. If a search has been made, then only the links
    matching their search query are shown.
    """

    if not hasattr(current_user, "netid"):
        # Anonymous user
        return redirect("/login")

    # If database client is broken, redirect error.
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    # Grab the current page number
    try:
        page = int(request.args["p"])
    except:
        page = 0

    # If this exists, execute a search query
    try:
        query = request.args["search"]
    except:
        query = ""

    # Display all users or just the current administrator?
    try:
        all_users = request.args["all_users"]
    except:
        if "all_users" in request.cookies:
            all_users = request.cookies["all_users"]
        else:
            all_users = "1"

    # Change sorting preferences
    if "sortby" in request.args:
        sortby = request.args["sortby"]
    elif "sortby" in request.cookies:
        sortby = request.cookies["sortby"]
    else:
        sortby = "0"

    if client.is_user(current_user.netid) is None: # Add if user does not exist
        client.add_user(current_user.netid, 0, 'jcc')

    # Depending on the type of user, get info from the database
    is_admin = not current_user.is_anonymous() and current_user.is_admin()
    if is_admin:
        netid = current_user.netid
        if query:
            cursor = client.search(query)
        elif all_users == "1":
            cursor = client.get_all_urls(query)
        else:
            cursor = client.get_urls(current_user.netid)
    else:
        netid = current_user.netid
        if query:
            cursor = client.search(query, netid=netid)
            app.logger.info("{}: search for '{}'".format(netid, query))
        else:
            cursor = client.get_urls(current_user.netid)
            app.logger.info("{}: render index".format(netid))

    # Perform sorting, pagination and get the results
    cursor.sort(sortby)

    if int(sortby) in [0, 1]:
        page, lastpage = cursor.paginate(page, app.config["MAX_DISPLAY_LINKS"])
        links = cursor.get_results()

    # If links are requested alphabetically, run more specific cursor operations
    elif int(sortby) in [2, 3]:

        # Clone the cursor, and paginate the clone. Sort all links from old cursor.
        page_cursor = client.clone_cursor(cursor)
        page, lastpage = page_cursor.paginate(page, app.config["MAX_DISPLAY_LINKS"])
        links = sorted(cursor.get_results(), key=lambda x: str.lower(str(x['title'])))
        if int(sortby) in [3]: links = reversed(links)

        # Skip and limit on the old cursor's links.
        link_offset = (page-1)*app.config["MAX_DISPLAY_LINKS"]
        links = list(links)[link_offset:link_offset+8]

    # Add views from inside RU for every link in links.
    for link in links:
        link['ru_visits'] = len( # Number of RU IP visitors for all link dicts
            list(filter(
                 # Filter the IPs that are from Rutgers only
                 lambda x: any(x.startswith(rutgers_ip)
                 for rutgers_ip in app.config["RUTGERS_IP_LIST"]),
                 list(map(
                    # List of IPs that have accessed the short URL
                    lambda x: x['source_ip'],
                    client.get_visits(link["_id"]).get_results()
                 ))
            ))
        )
        link['qr_code'] = gen_qr(app, link['_id'])

    resp = make_response(
            render_template("index.html",
                            admin=is_admin,
                            all_users=all_users,
                            lastpage=lastpage,
                            links=links,
                            linkserver_url=app.config["LINKSERVER_URL"],
                            netid=netid,
                            page=page,
                            query=query,
                            sortby=sortby,
                            **kwargs))
    resp.set_cookie("all_users", all_users)
    resp.set_cookie("sortby", sortby)
    return resp

#OLD API ROUTE THAT WILL NOT BE USED
@app.route("/stats/<short_url_id>", methods=["GET"])
@login_required
def stats(short_url_id):
    """Display statistics about a short URL.
    """
    # Create database client and cursor for visit collection
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")
    visit_cursor = client.get_visits(short_url_id)

    # Connect to MaxMind GeoIP database. Covers over 99.9999% of active IPs
    gi = pygeoip.GeoIP(app.config["GEO_IP_PATH"])

    # Get list of IPs and then filter them by the config-list for Rutgers IPs
    ip_list = list(map(lambda x: x['source_ip'], visit_cursor.get_results()))
    ru_ip_list = list(filter(lambda x: any(x.startswith(rutgers_ip)
        for rutgers_ip in app.config["RUTGERS_IP_LIST"]), ip_list))

    # Print the full records for every IP that has accessed that URL
    for ip in ip_list:
        print(gi.record_by_addr(ip))

    app.logger.info("{}: render stats short_url '{}'".format(
        current_user.netid, short_url_id))
    return str(len(ru_ip_list)) + ":" + str(len(ip_list)-len(ru_ip_list))


@app.route("/login", methods=['GET', 'POST'])
def login():
    """Handles authentication."""
    # If database client is broken, redirect error.
    if get_db_client(app, g) is None:
        app.logger.critical("login: database connection failure")
        return render_template("/error.html")
    a = Auth(app.config['AUTH'], get_user)
    return a.login(request, RULoginForm, render_login, login_success)


@app.route("/logout")
@login_required
def logout():
    """Handles logging out."""
    app.logger.info("{}: logout".format(current_user.netid))
    logout_user()
    return redirect('/')


@app.route("/add", methods=["GET", "POST"])
@login_required
def add_link():
    """Adds a new link for the current user."""
    form = LinkForm(request.form,
                    banlist=[strip_protocol(app.config["LINKSERVER_URL"])])

    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    if request.method == "POST":
        # Validate the form
        form.long_url.data = ensure_protocol(form.long_url.data)
        if form.validate():
            # TODO Decide whether we want to do something with the response
            kwargs = form.to_json()
            try:
                response = client.create_short_url(
                                netid=current_user.netid,
                                **kwargs
                            )
                app.logger.info("{}: short_url add '{}'".
                        format(current_user.netid, response))
                return redirect("/")
            except Exception as e:
                app.logger.warning("{}: exception in add '{}'".format(
                    current_user.netid, str(e)))
                return render_template("add.html",
                                       errors={'short_url' : [str(e)]},
                                       netid=current_user.netid,
                                       elevated=current_user.is_elevated())

        else:
            # WTForms detects a form validation error
            return render_template("add.html",
                                   errors=form.errors,
                                   netid=current_user.netid,
                                   elevated=current_user.is_elevated())
    else:
        # GET request
        app.logger.info("{}: render add".format(current_user.netid))
        return render_template("add.html",
                               netid=current_user.netid,
                               elevated=current_user.is_elevated())


@app.route("/delete", methods=["GET", "POST"])
@login_required
def delete_link():
    """Deletes a link."""
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    # TODO Handle the response intelligently, or put that logic somewhere else
    if request.method == "POST":
        client.delete_url(request.form["short_url"])
        app.logger.info("{}: short_url delete: '{}'".format(
            current_user.netid, request.form["short_url"]))
    return redirect("/")


@app.route("/edit", methods=["GET", "POST"])
@login_required
def edit_link():
    """Edits a link.

    On POST, this route expects a form that contains the unique short URL that
    will be edited.
    """
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    form = LinkForm(request.form,
                    banlist=[strip_protocol(app.config["LINKSERVER_URL"])])

    if request.method == "POST":
        # Validate form before continuing
        if form.validate():
            # Success - make the edits in the database
            kwargs = form.to_json()
            try:
                response = client.modify_url(
                    old_short_url = request.form["old_short_url"],
                    elevated=current_user.is_elevated(),
                    **kwargs
                )
                app.logger.info("{}: short_url edit '{}'".format(
                    current_user.netid, request.form["old_short_url"], response))
                return redirect("/")
            except Exception as e:
                app.logger.warning("{}: exception in edit short_url '{}' - '{}'".format(
                    current_user.netid, request.form["old_short_url"], str(e)))
                return render_template("edit.html",
                                       errors={'short_url' : [str(e)]},
                                       netid=current_user.netid,
                                       elevated=current_user.is_elevated(),
                                       title=request.form["title"],
                                       old_short_url=request.form["old_short_url"],
                                       long_url=request.form["long_url"])
        else:
            # yikes - we might want to refactor this stuff into forms.py
            if not form.long_url.data.startswith("http://"):
                form.long_url.data = "http://" + form.long_url.data

            if form.validate():
                kwargs = form.to_json()
                try:
                    response = client.modify_url(
                        elevated=current_user.is_elevated(),
                        **kwargs
                    )
                    app.logger.info("{}: long_url edit '{}'".format(
                        current_user.netid, form.long_url.data))
                    return redirect("/")
                except Exception as e:
                    app.logger.warning("{}: exception in edit long_url '{}' - '{}'".format(
                        current_user.netid, str(e)))
                    return render_template("edit.html",
                                           errors={'short_url' : [str(e)]},
                                           netid=current_user.netid,
                                           elevated=current_user.is_elevated(),
                                           title=request.form["title"],
                                           old_short_url=request.form["old_short_url"],
                                           long_url=request.form["long_url"])
            else:
                # Validation error
                old_short_url = request.form["old_short_url"]
                info = client.get_url_info(old_short_url)
                long_url = info["long_url"]
                title = info["title"]
                return render_template("edit.html",
                                    errors=form.errors,
                                    netid=current_user.netid,
                                    elevated=current_user.is_elevated(),
                                    title=title,
                                    old_short_url=old_short_url,
                                    long_url=long_url)
    else: # GET request
        # Hit the database to get information
        old_short_url = request.args["url"]
        info = client.get_url_info(old_short_url)
        owner = info["netid"]
        if owner != current_user.netid and not current_user.is_admin():
            return render_index(wrong_owner=True)

        long_url = info["long_url"]
        title = info["title"]
        # Render the edit template
        app.logger.info("{}: render edit".format(current_user.netid))
        return render_template("edit.html", netid=current_user.netid,
                                            elevated=current_user.is_elevated(),
                                            title=title,
                                            old_short_url=old_short_url,
                                            long_url=long_url)


@app.route("/admin/manage")
@login_required
@admin_required(unauthorized_admin)
def admin_manage():
    """Renders a list of administrators.

    Allows an admin to add and remove NetIDs from the list of official
    administrators.
    """
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    return render_template("admin_list.html",
                           admin=True,
                           users=client.get_users(),
                           form=UserForm(request.form),
                           netid=current_user.netid)


@app.route("/admin/manage/add", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def user_add():
    """Add a new user."""

    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    form = UserForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.add_user(form.netid.data, form.type.data, current_user.netid)
            app.logger.info("{}: user add '{}'".format(
                current_user.netid, form.netid.data))
        else:
            # TODO catch validation errors
            pass

    return redirect("/admin/manage")
    

@app.route("/admin/manage/edit", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def user_edit():
    """Edit a preexisting user."""
    
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    form = UserForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.edit_user_type(form.netid.data, form.type.data)
            app.logger.info("{}: user edit '{}'".format(
                current_user.netid, form.netid.data))
        else:
            # TODO catch validation errors
            pass

    return redirect("/admin/manage")


@app.route("/admin/manage/delete", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def user_delete():
    """Delete a user."""

    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    if request.method == "POST":
        netid = request.form["netid"]
        client.delete_user(netid)
        app.logger.info("{}: user delete '{}'".format(
            current_user.netid, netid))

    return redirect("/admin/manage")


@app.route("/admin/links/block", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_block_link():
    """Block a link from being shrunk.

    Allows an administrator to block a link pattern from being shrunk by the
    web application. URLs matching the given regular expression will be
    prohibited.
    """

    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    form = BlockLinksForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.block_link(form.link.data, current_user.netid)
            app.logger.info("{}: admin block_link '{}'".format(
                current_user.netid, form.link.data))
        else:
            # TODO catch validation errors
            pass

    return redirect("/admin/links")


@app.route("/admin/links/unblock", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_unblock_link():
    """Remove a link from the banned links list."""

    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    if request.method == "POST":
        client.allow_link(request.form["url"])
        app.logger.info("{}: admin unblock_link '{}'".format(
            current_user.netid, form.link.data))

    return redirect("/admin/links")


@app.route("/admin/links", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_links():
    """Renders the administrator link banlist.

    Allows admins to block (and unblock) particular URLs from being shrunk.
    """
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    app.logger.info("{}: render admin_links".format(current_user.netid))
    return render_template("admin_links.html",
                           admin=True,
                           banlist=client.get_blocked_links(),
                           form=BlockLinksForm(request.form),
                           netid=current_user.netid)


@app.route("/admin/")
@login_required
@admin_required(unauthorized_admin)
def admin_panel():
    """Renders the administrator panel.

    This displays an administrator panel with navigation links to the admin
    controls.
    """
    app.logger.info("{}: render admin_panel".format(current_user.netid))
    return render_template("admin.html", netid=current_user.netid)


@app.route("/admin/blacklist", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_blacklist():
    """Renders the administrator blacklist.

    Allows admins to blacklist users to prevent them from accessing the web
    interface.
    """
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    app.logger.info("{}: render admin_blacklist".format(current_user.netid))
    return render_template("admin_blacklist.html",
                           admin=True,
                           blacklist=client.get_blacklisted_users(),
                           netid=current_user.netid)


@app.route("/admin/blacklist/ban", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_ban_user():
    """Ban a user from using the web application.

    Adds a user to the blacklist.
    """
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    form = BlacklistUserForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.ban_user(form.netid.data, current_user.netid)
            app.logger.info("{}: banned user '{}'".format(
                current_user.netid, form.netid.data))
        else:
            # TODO Catch validation errors
            pass

    return redirect("/admin/blacklist")


@app.route("/admin/blacklist/unban", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_unban_user():
    """Unban a user from the blacklist.

    Removes a user from the blacklist, restoring their previous privileges.
    """
    client = get_db_client(app, g)
    if client is None:
        app.logger.critical("{}: database connection failure".format(
            current_user.netid))
        return render_template("/error.html")

    if request.method == "POST":
        client.unban_user(request.form["netid"])
        app.logger.info("{}: unbanned user '{}'".format(
            current_user.netid, form.netid.data))

    return redirect("/admin/blacklist")


class BlockedUrlsListAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def get(self):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR

        blocked_links = client.get_blocked_links()
        for link in blocked_links:
            link.pop('_id')
        
        return {'data': blocked_links}, 200


class BlockedUrlsAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def put(self, url):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR

        client.block_link(url, current_user.netid)
        if client.is_blocked(url):
            return {'data': {}}, 200
        else:
            app.logger.info("{}: failed to block url '{}'".format(
                            current_user.netid, url))
            abort(500)  # 500 INTERNAL SERVER ERROR

    def delete(self, url):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR

        client.allow_link(url)
        if not client.is_blocked(url):
            return {'data': {}}, 200
        else:
            app.logger.critical("{}: failed to unblock url '{}'".format(
                                current_user.netid, url))
            abort(500)  # 500 INTERNAL SERVER ERROR


class UsersListAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def get(self):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR
        
        users = client.get_users()
        for user in users:
            user.pop('_id')

        return {'data': users}, 200


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
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR

        args = self.reqparse.parse_args()

        if args['type'] is not None:
            client.edit_user_type(netid, args['type'])  # TODO: error checking?

        if args['is_blacklisted'] is not None:
            if args['is_blacklisted']:
                client.ban_user(netid, current_user.netid)  # TODO: error check
            else:
                client.unban_user(netid)  # TODO: error checking?

        return {'data': {}}, 200


class UserUrlsAPI(Resource):
    decorators = [login_required]

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('title', type=str, required=True,
                                   location="json", help="Error: {error_msg}")
        self.reqparse.add_argument('url', type=str, required=True,
                                   help="Error: {error_msg}", location="json")
        self.reqparse.add_argument('alias', type=str, required=False,
                                   location="json")
        super(UserUrlsAPI, self).__init__()

    def get(self, netid):
        # For GET there are no arguments, so we do not call parse_args()
        # and therefore the Required args will not have to be supplied
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR

        urls = client.get_urls(netid).get_results()
        
        # Generate QR codes
        for url in urls:
            url['qr_code'] = "data:image/png;base64," + gen_qr(app, url['_id'])

        # This is strange: we cannot convert this mongo time into json
        # I believe this issue will disappear when we move to mongoengine
        for url in urls:
            url['timeCreated'] = str(url['timeCreated'])

        print(urls)
        return {"data": urls}, 200

    def post(self, netid):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR

        args = self.reqparse.parse_args()

        long_url = args['url']
        title = args['title']
        alias = args['alias']

        if client.is_blocked(long_url):
            return {"message": {"url": "Banned url"}}, 403  # 403 FORBIDDEN

        if alias is not None:
            if client.get_user_type(netid) >= 10:
                # TODO: error checking
                client.create_short_url(long_url=long_url, short_url=alias, 
                                        netid=netid, title=title)
                return {"data": {}}, 200
            else:
                abort(403)  # 403 FORBIDDEN
        
        else:
            # TODO: error checking
            client.create_short_url(long_url=long_url, netid=netid, title=title)
            return {"data": {}}, 200


class UrlsListAPI(Resource):
    decorators = [login_required, admin_required(unauthorized_admin)]

    def get(self):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR
        
        urls = client.get_all_urls().get_results()

        # Generate QR codes
        for url in urls:
            url['qr_code'] = "data:image/png;base64," + gen_qr(app, url['_id'])

        # same issue in UserUrlsAPI.get()
        for url in urls:
            url['timeCreated'] = str(url['timeCreated'])

        return {'data': urls}, 200


class UrlsAPI(Resource):
    decorators = [login_required]

    def delete(self, id):
        client = get_db_client(app, g)
        if client is None:
            app.logger.critical("database connection failure")
            abort(500)  # 500 INTERNAL SERVER ERROR
        
        link = client.get_url_info(id)
        if link is None:
            abort(404)

        if link['netid'] != current_user.netid and not current_user.is_admin():
            abort(403)  # 403 FORBIDDEN

        client.delete_url(id)  # TODO: error checking
        return {'data': {}}, 200


class UrlStatsAPI(Resource):
    def get(self, id):
        abort(501)  # not yet implemented


api.add_resource(BlockedUrlsListAPI,    '/api/blocked_urls')
api.add_resource(BlockedUrlsAPI,        '/api/blocked_urls/<string:url>')
api.add_resource(UsersListAPI,          '/api/users')
api.add_resource(UsersAPI,              '/api/users/<string:netid>')
api.add_resource(UserUrlsAPI,           '/api/users/<string:netid>/urls')
api.add_resource(UrlsListAPI,           '/api/urls')
api.add_resource(UrlsAPI,               '/api/urls/<string:id>')
api.add_resource(UrlStatsAPI,           '/api/urls/<string:id>/stats')

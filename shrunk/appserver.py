""" shrunk - Rutgers University URL Shortener

Sets up a Flask application for the main web server.
"""
from flask import Flask, render_template, make_response, request, redirect, g
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_auth import Auth

from shrunk.forms import BlockLinksForm, LinkForm, RULoginForm, BlacklistUserForm, AddAdminForm
from shrunk.user import User, get_user, admin_required
from shrunk.util import get_db_client, set_logger, formattime
from shrunk.filters import strip_protocol, ensure_protocol


# Create application
app = Flask(__name__)

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
    return redirect('/')


def unauthorized_admin():
    return redirect("/")


### Views ###
try:
    if app.config["DUAL_SERVER"]:
        @app.route("/<short_url>")
        def redirect_link(short_url):
            """Redirects to the short URL's true destination.

            This looks up the short URL's destination in the database and performs a
            redirect, logging some information at the same time. If no such link
            exists, a not found page is shown.

            :Parameters:
              - `short_url`: A string containing a shrunk-ified URL.
            """
            client = get_db_client(app, g)
            app.logger.info("{} requests {}".format(request.remote_addr, short_url))

            # Perform a lookup and redirect
            long_url = client.get_long_url(short_url)
            if long_url is None:
                return render_template("link-404.html", short_url=short_url)
            else:
                client.visit(short_url, request.remote_addr)
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
    client = get_db_client(app, g)
    if not hasattr(current_user, "netid"):
        # Anonymous user
        return redirect("/login")

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
            app.logger.info("search: {}, '{}'".format(netid, query))
        else:
            cursor = client.get_urls(current_user.netid)
            app.logger.info("render index: {}".format(netid))

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
        links = sorted(cursor.get_results(), key=lambda x: str.lower(x['title']))
        if int(sortby) in [3]: links = reversed(links)

        # Skip and limit on the old cursor's links.
        link_offset = (page-1)*app.config["MAX_DISPLAY_LINKS"]
        links = list(links)[link_offset:link_offset+8]

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


@app.route("/login", methods=['GET', 'POST'])
def login():
    """Handles authentication."""
    a = Auth(app.config['AUTH'], get_user)
    return a.login(request, RULoginForm, render_login, login_success)


@app.route("/logout")
@login_required
def logout():
    """Handles logging out."""
    logout_user()
    return redirect('/')


@app.route("/add", methods=["GET", "POST"])
@login_required
def add_link():
    """Adds a new link for the current user."""
    form = LinkForm(request.form,
                    banlist=[strip_protocol(app.config["LINKSERVER_URL"])])
    client = get_db_client(app, g)

    if request.method == "POST":
        # Validate the form
        form.long_url.data = ensure_protocol(form.long_url.data)
        if form.validate():
            # TODO Decide whether we want to do something with the response
            kwargs = form.to_json()
            try:
                client.create_short_url(
                    netid=current_user.netid,
                    **kwargs
                )
                return redirect("/")
            except Exception as e:
                return render_template("add.html",
                                       errors={'short_url' : [str(e)]},
                                       netid=current_user.netid,
                                       admin=current_user.is_admin())

        else:
            # WTForms detects a form validation error
            return render_template("add.html",
                                   errors=form.errors,
                                   netid=current_user.netid,
                                   admin=current_user.is_admin())
    else:
        # GET request
        return render_template("add.html",
                               netid=current_user.netid,
                               admin=current_user.is_admin())


@app.route("/delete", methods=["GET", "POST"])
@login_required
def delete_link():
    """Deletes a link."""
    client = get_db_client(app, g)

    # TODO Handle the response intelligently, or put that logic somewhere else
    if request.method == "POST":
        app.logger.info("Deleting URL: {}".format(request.form["short_url"]))
        client.delete_url(request.form["short_url"])
    return redirect("/")


@app.route("/edit", methods=["GET", "POST"])
@login_required
def edit_link():
    """Edits a link.

    On POST, this route expects a form that contains the unique short URL that
    will be edited.
    """
    client = get_db_client(app, g)
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
                    **kwargs
                )
                return redirect("/")
            except Exception as e:
                return render_template("edit.html",
                                       errors={'short_url' : [str(e)]},
                                       netid=current_user.netid,
                                       admin=current_user.is_admin(),
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
                        **kwargs
                    )
                    return redirect("/")
                except Exception as e:
                    return render_template("edit.html",
                                           errors={'short_url' : [str(e)]},
                                           netid=current_user.netid,
                                           admin=current_user.is_admin(),
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
        return render_template("edit.html", netid=current_user.netid,
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
    return render_template("admin_list.html",
                           admin=True,
                           admins=client.get_admins(),
                           form=AddAdminForm(request.form),
                           netid=current_user.netid)


@app.route("/admin/manage/add", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_add():
    """Add a new administrator."""
    client = get_db_client(app, g)
    form = AddAdminForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.add_admin(form.netid.data, current_user.netid)
        else:
            # TODO catch validation errors
            pass

    return redirect("/admin/manage")


@app.route("/admin/manage/delete", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_delete():
    """Delete an existing administrator."""
    client = get_db_client(app, g)
    if request.method == "POST":
        client.delete_admin(request.form["netid"])

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
    form = BlockLinksForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.block_link(form.link.data, current_user.netid)
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
    if request.method == "POST":
        client.allow_link(request.form["url"])

    return redirect("/admin/links")


@app.route("/admin/links", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_links():
    """Renders the administrator link banlist.

    Allows admins to block (and unblock) particular URLs from being shrunk.
    """
    client = get_db_client(app, g)
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
    form = BlacklistUserForm(request.form)
    if request.method == "POST":
        if form.validate():
            client.ban_user(form.netid.data, current_user.netid)
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
    if request.method == "POST":
        client.unban_user(request.form["netid"])

    return redirect("/admin/blacklist")

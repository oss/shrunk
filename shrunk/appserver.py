""" shRUnk - Rutgers University URL Shortener

Sets up a Flask application for the main web server.
"""
from flask import Flask, render_template, make_response, request, redirect, g
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_auth import Auth

from shrunk.client import ShrunkCursor
from shrunk.forms import BlockLinksForm
from shrunk.forms import LinkForm, RULoginForm, BlacklistUserForm, AddAdminForm
from shrunk.user import User, get_user, admin_required
from shrunk.util import get_db_client, set_logger, formattime


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
    page, lastpage = cursor.paginate(page, app.config["MAX_DISPLAY_LINKS"])
    links = cursor.get_results()

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
    form = LinkForm(request.form)
    client = get_db_client(app, g)

    if request.method == "POST":
        # Validate the form
        if form.validate():
            # TODO Handle an error on db insert
            kwargs = form.to_json()
            response = client.create_short_url(
                netid=current_user.netid,
                **kwargs
            )
            if not response:
                # Specifically, there is no response from the database
                return render_template("add.html",
                                       errors=["Blocked Link"],
                                       admin=current_user.is_admin())
            else:
                # Success
                return redirect("/")
        else:
            # WTForms detects a form validation error
            return render_template("add.html",
                                   errors=form.errors,
                                   netid=current_user.netid,
                                   admin=current_user.is_admin())
    else: # GET request
        if not request.form:
            form = LinkForm()

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
    form = LinkForm(request.form)

    if request.method == "POST":
        # Validate form before continuing
        if form.validate():
            # Success - make the edits in the database
            kwargs = form.to_json()
            response = client.modify_url(
                request.form["short_url"],
                **kwargs
            )
            return redirect("/")
        else:
            # Validation error
            short_url = request.form["short_url"]
            info = client.get_url_info(short_url)
            long_url = info["long_url"]
            title = info["title"]
            return render_template("edit.html",
                                   errors=form.errors,
                                   netid=current_user.netid,
                                   title=title,
                                   short_url=short_url,
                                   long_url=long_url)
    else: # GET request
        # Hit the database to get information
        short_url = request.args["url"]
        info = client.get_url_info(short_url)
        owner = info["netid"]
        if owner != current_user.netid:
            return render_index(wrong_owner=True)

        long_url = info["long_url"]
        title = info["title"]   
        # Render the edit template
        return render_template("edit.html", netid=current_user.netid,
                                            title=title,
                                            short_url=short_url,
                                            long_url=long_url)

@app.route("/admin/")
@app.route("/admin/<action>", methods=["GET", "POST"])
@login_required
@admin_required(unauthorized_admin)
def admin_sub(action=None):
    """Renders the admin interface.
    :Parameters:
      - `action`: Which action to take. This can be one of the following:
        1. blacklist - Go to blacklist panel used for blacklisting users
        2. add - Go to add panel used for adding additional admins
        3. blocklink - Go to block link panel, used for blacklisting long urls
    """

    netid = current_user.netid
    if action == None:
        return render_template("admin.html", netid=netid)
    client = get_db_client(app, g)
    if action == 'blacklist':
        form = BlacklistUserForm(request.form)
        if request.method == "POST" and form.validate():
            if form.action.data == 'ban':
                res = client.blacklist_user(form.netid.data, netid)
            else:
                res = client.allow_user(form.netid.data)
            return render_template('admin_blacklist.html', form=form,
                                   netid=netid, msg='Success!')
        return render_template('admin_blacklist.html', netid=netid, form=form)

    elif action == 'add':
        form = AddAdminForm(request.form)
        if request.method == "POST" and form.validate():
            res = client.add_admin(form.netid.data, current_user.netid)
            return render_template('admin_add.html', form=form, netid=netid,
                                   msg='Success!')
        return render_template('admin_add.html', form=form, netid=netid)

    elif action == 'blocklink':
        form = BlockLinksForm(request.form)
        if request.method == "POST" and form.validate():
            if form.action.data == 'block':
                res = client.block_link(form.link.data, netid)
            else:
                res = client.allow_link(form.link.data)
            return render_template('admin_block_links.html', form=form,
                                   msg='Success!', netid=netid)
        return render_template('admin_block_links.html', form=form,
                               netid=netid)

    else:
        return redirect('/')

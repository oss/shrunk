""" shRUnk - Rutgers University URL Shortener

Sets up a Flask application for shRUnk.
"""
from flask import Flask, render_template, request, redirect, g
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
@app.route("/")
def render_index(**kwargs):
    """Renders the homepage.

    Renders the homepage for the current user. By default, this renders all of
    the links owned by them. If a search has been made, then only the links
    matching their search query are shown.
    """
    client = get_db_client(app, g)

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

    # Depending on the type of user, get info from the database
    is_admin = not current_user.is_anonymous() and current_user.is_admin()
    if not hasattr(current_user, "netid"):
        netid = None
        cursor = ShrunkCursor(None)
        app.logger.info("render index: anonymous user")
    elif is_admin:
        netid = current_user.netid
        if query:
            cursor = client.search(query)
        else:
            cursor = client.get_all_urls(query)
    else:
        netid = current_user.netid
        if query:
            cursor = client.search(query, netid=netid)
            app.logger.info("search: {}, '{}'".format(netid, query))
        else:
            cursor = client.get_urls(current_user.netid)
            app.logger.info("render index: {}".format(netid))

    # Perform pagination and get the results
    page, lastpage = cursor.paginate(page, app.config["MAX_DISPLAY_LINKS"])
    links = cursor.get_results()

    return render_template("index.html",
                           admin=is_admin,
                           links=links,
                           linkserver_url=app.config["LINKSERVER_URL"],
                           netid=netid,
                           page=page,
                           lastpage=lastpage,
                           query=query,
                           **kwargs)


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
        if form.validate():
            # TODO Handle an error on db insert
            kwargs = form.to_json()
            response = client.create_short_url(
                netid=current_user.netid,
                **kwargs
            )
            if not response:
                return render_template("add.html", errors=["Blocked Link"])
            return render_index(new_url=response,
                                new_target_url=kwargs["long_url"])
        else:
            return render_template("add.html",
                                   errors=form.errors,
                                   netid=current_user.netid)

    if not request.form:
        form = LinkForm()
    return render_template("add.html", netid=current_user.netid)


@app.route("/delete", methods=["GET", "POST"])
@login_required
def delete_link():
    """Deletes a link."""
    client = get_db_client(app, g)

    # TODO Handle the response intelligently, or put that logic somewhere else
    if request.method == "POST":
        app.logger.info("Deleting URL: {}".format(request.form["short_url"]))
        client.delete_url(request.form["short_url"])
    return render_index(deleted_url=request.form["short_url"])

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

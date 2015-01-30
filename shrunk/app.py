""" shRUnk - Rutgers University URL Shortener

Sets up a Flask application for shRUnk.
"""
from flask import Flask, render_template, request, redirect, g
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_auth import Auth

from shrunk.forms import LinkForm, RULoginForm
from shrunk.user import User, get_user
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


### Views ###
@app.route("/")
def render_index(**kwargs):
    """Renders the homepage."""
    client = get_db_client(app, g)

    try:
        links = client.get_urls(current_user.netid)
        app.logger.info("Rendering index for user {}".format(current_user))
    except AttributeError:
        links = []
        app.logger.info("Rendering index for anonymous user.")

    return render_template("index.html",
                           links=links,
                           linkserver_url=app.config["LINKSERVER_URL"],
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
    if request.method == "POST" and form.validate():
        # TODO Handle an error on db insert
        kwargs = form.to_json()
        response = client.create_short_url(
            netid=current_user.netid,
            **kwargs
        )
        return render_index(new_url=response, new_target_url=kwargs["long_url"])

    if not request.form:
        form = LinkForm()
    return render_template("link.html",
                           netid=current_user.netid,
                           action_header="Create a Link",
                           action="add_link",
                           submit_text="Shrink!",)


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

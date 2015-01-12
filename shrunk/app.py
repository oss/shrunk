""" shRUnk - Rutgers University URL Shortener

Sets up a Flask application for shRUnk.
"""
import logging

from wtforms import Form, TextField, validators
from flask import Flask, render_template, request, redirect
from flask_login import LoginManager, login_required, current_user, logout_user
from flask_auth import Auth

from shrunk.client import ShrunkClient
from shrunk.user import User, get_user, RULoginForm


# Create application
app = Flask(__name__)

# Import settings in config.py
app.config.from_pyfile("config.py", silent=True)
app.secret_key = app.config['SECRET_KEY']

# Initialize logging
format = "%(levelname)s %(asctime)s: %(message)s [in %(pathname)s:%(lineno)d]"
handler = logging.FileHandler("shrunk.log")
handler.setLevel(logging.INFO)
handler.setFormatter(logging.Formatter(format))

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = '/login'


@login_manager.user_loader
def load_user(userid):
    """Loads user object for login.
    
    :Parameters:
      - `userid`: An id for the user (typically a NetID).
    """
    return User(userid)


### Views ###
@app.route("/")
def render_index():
    """Renders the homepage."""
    # TODO
    pass

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
    #TODO
    pass


@app.route("/delete", methods=["GET", "POST"])
@login_required
def delete_link():
    """Deletes a link."""
    # TODO
    pass


### Helper Functions ###
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

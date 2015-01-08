""" shRUnk - Rutgers University URL Shortener

Sets up a Flask application for shRUnk.
"""
import logging

from wtforms import Form, TextField, validators
from flask import Flask, render_template, request

import secrets
from shrunk_client import ShrunkClient


# Create application
app = Flask(__name__)

# Default configuration can be overridden via SHRUNK_SETTINGS
app.config.update({
    "DB_HOST": "localhost",
    "DB_PORT": 27017
})
app.config.from_envvar("SHRUNK_SETTINGS", silent=True)

# Initialize logging
format = "%(levelname)s %(asctime)s: %(message)s [in %(pathname)s:%(lineno)d]"
handler = logging.FileHandler("shrunk.log")
handler.setLevel(logging.INFO)
handler.setFormatter(logging.Formatter(format))


@app.route("/")
def render_index():
    """ Renders the homepage. """
    # TODO
    pass


@app.route("/login")
def render_login():
    """ Handles authentication. """
    # TODO
    pass


@app.route("/add", methods=["GET", "POST"])
def add_link():
    """ Adds a new link for the current user. """
    pass


@app.route("/delete", methods=["GET"])
def delete_link():
    """ Deletes a link. """
    # TODO
    pass

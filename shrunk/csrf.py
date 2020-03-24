""" flask_wtf-based CSRF protection. """

import flask_wtf.csrf

ext = flask_wtf.csrf.CSRFProtect()

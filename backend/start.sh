#!/bin/sh
deactivate
export FLASK_APP=shrunk && export FLASK_DEBUG=true && export FLASK_ENV=dev && export WERKZEUG_DEBUG_PIN=off
. venv/bin/activate
flask run
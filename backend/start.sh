#!/bin/sh
export FLASK_APP=shrunk && export FLASK_DEBUG=true && export FLASK_ENV=dev && export WERKZEUG_DEBUG_PIN=off
flask run
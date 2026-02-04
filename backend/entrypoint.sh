#!/usr/bin/env sh

# TODO: not sure if we need this
mkdir logs
exec gunicorn --bind 0.0.0.0:3050 --worker-tmp-dir  /dev/shm  --workers=2 --threads=4 --worker-class=gthread "${FLASK_APP}:create_app()"

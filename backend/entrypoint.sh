#!/usr/bin/env sh

if [ "$#" -gt 0 ]; then
    exec "$@"
elif $FLASK_DEBUG; then
    export FLASK_APP=shrunk
    exec python -m flask run --host=0.0.0.0 -p 3050
else
    exec uwsgi --module "${FLASK_APP}:create_app()" --master --processes 4 --threads 2 --socket 0.0.0.0:3050
    # exec gunicorn --bind 0.0.0.0:3050 --worker-tmp-dir /dev/shm  --workers=2 --threads=4 --worker-class=gthread --worker-class asgi --protocol uwsgi --uwsgi-allow-from '*' "${FLASK_APP}:create_app()" 
fi


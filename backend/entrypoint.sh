#!/usr/bin/env sh
set -e

if [ "$#" -gt 0 ]; then
    exec "$@"
elif $FLASK_DEBUG; then
    python -m shrunk.migrate
    if $SHRUNK_SEED_DATABASE; then
	python scripts/seed_data.py
    fi

    exec python -m flask run --host=0.0.0.0 -p 3050
else
    python -m shrunk.migrate
    # Mainly used in ci/cd, in production since we disable developer logins this
    # will actually error, so it is fine to have this here.
    # Without this we would need to modify the frontend container to handle both
    # uswgi and http cases for the backend, which is unclean, this is still not
    # as clean, but is it bit more transparent compared with the other option.
    if $SHRUNK_SEED_DATABASE; then
	python scripts/seed_data.py
    fi

    exec uwsgi --module "${FLASK_APP}:create_app()" --master --lazy-apps --processes 4 --threads 2 --socket 0.0.0.0:3050
    # exec gunicorn --bind 0.0.0.0:3050 --worker-tmp-dir /dev/shm  --workers=2 --threads=4 --worker-class=gthread --worker-class asgi --protocol uwsgi --uwsgi-allow-from '*' "${FLASK_APP}:create_app()"
fi

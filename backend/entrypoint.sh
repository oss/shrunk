#!/usr/bin/env sh

# exec gunicorn --bind 0.0.0.0:3050 --worker-tmp-dir /dev/shm  --workers=2 --threads=4 --worker-class=gthread --worker-class asgi --protocol uwsgi --uwsgi-allow-from '*' "${FLASK_APP}:create_app()" 
exec uwsgi --module "${FLASK_APP}:create_app()" --master --processes 4 --threads 2 --socket 0.0.0.0:3050

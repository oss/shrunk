#!/bin/sh
set -eu

until node -e "Promise.all(['/api/core/enabled', '/api/core/user/info'].map((path) => fetch('http://' + process.env.PA11Y_URL + path).then((response) => { if (!response.ok) throw new Error('API not ready'); return response.json(); }))).then(() => process.exit(0)).catch(() => process.exit(1))"; do
  sleep 1
done

exec /opt/shrunk-pa11y-ci/node_modules/.bin/pa11y-ci "$@"

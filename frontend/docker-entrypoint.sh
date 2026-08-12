#!/usr/bin/env sh
set -eu

lockfile_hash="$(sha256sum package-lock.json | awk '{print $1}')"
installed_hash_file="node_modules/.shrunk-package-lock.sha256"

if [ ! -r "$installed_hash_file" ] || [ "$(cat "$installed_hash_file")" != "$lockfile_hash" ]; then
    echo "Installing frontend dependencies from package-lock.json..."
    npm ci
    printf '%s\n' "$lockfile_hash" > "$installed_hash_file"
fi

exec "$@"

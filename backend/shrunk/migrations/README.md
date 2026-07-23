# Shrunk Mongo migrations

Shrunk runs Mongo migrations from `backend/entrypoint.sh` before starting
Flask or uwsgi:

```sh
python -m shrunk.migrate
```

`shrunk.migrate` connects with the same Shrunk DB environment variables used
by the backend container:

- `SHRUNK_DB_HOST`
- `SHRUNK_DB_PORT`
- `SHRUNK_DB_NAME`
- `SHRUNK_REPLICA_SET_NAME`

In the `MaCS/OSS/manifests` repo, Shrunk's OpenShift backend deployment is
configured with 3 backend replicas and env from `shrunk-env-dev`. MongoDB is
on-prem, not an OpenShift workload. That means a rollout can start multiple
backend pods that all try to migrate the same external Mongo replica set.
`shrunk.migrate` uses the `migration_locks` collection to serialize those
startup migrations.

Migration applied-state is stored by `pymongo-migrate` in `pymongo_migrate`.

## Add a migration

Run from `backend/`:

```sh
uv run pymongo-migrate generate -m shrunk/migrations "short description"
```

Then edit the generated file:

- keep `name` stable
- set `dependencies` to the previous migration
- put forward changes in `upgrade(db)`
- put the reverse in `downgrade(db)`

`db` is a `pymongo.database.Database`, so use normal pymongo calls against
Shrunk collections such as `urls`, `users`, `organizations`, `tickets`,
`visits`, or `access_tokens`.

Do not edit or rename a migration after it has run in a shared environment.
Add a new migration instead.

## Rules for Shrunk migrations

- Make `upgrade(db)` safe to run again. If it crashes before
  `pymongo_migrate` records success, the next container start reruns it.
- Prefer `update_many`, `upsert`, and `create_index` over unconditional
  inserts.
- Keep migrations short. The startup lock is treated as stale after 60
  minutes.
- If two branches add migrations from the same parent, the branch merged
  second must update its `dependencies` to point at the new latest migration.

Shrunk is Rutgers University's URL shortener (go.rutgers.edu): a Flask + MongoDB backend (`backend/`), a React/TypeScript/Vite frontend (`frontend/`), and Apache httpd + Shibboleth (`shib-sp/`) in front for SSO in production.

## Commands

### Running the stack
```sh
cp .env.example development.env   # first time only
docker-compose up                 # app at http://localhost:4343
```
Compose starts the backend (Flask dev server on :3050), the Vite dev server (:3000), and a 3-node Mongo replica set (`mongodb0..2`, built from `database/`). Set `FLASK_DEBUG=true` and `SHRUNK_DEV_LOGINS=1` for local dev logins; `SHRUNK_SEED_DATABASE=1` runs `backend/scripts/seed_data.py` on startup.

### Backend linting and type checks (run from `backend/`, deps managed by uv, Python >= 3.14)
```sh
uv sync                       # install deps + venv (needed for the lint tools and the pre-commit hook)
uv run ruff format            # format (CI runs `ruff format --check`)
uv run ruff check             # lint (CI also runs pylint, report-only)
uv run mypy .                 # not enforced in CI; config is strict (disallow_untyped_defs)
```

### Backend tests (always run through Docker)
Don't run pytest from your local venv. Tests need a Mongo replica set and the test env vars, and the test compose file provides both, matching how CI runs them.

First time only: copy `.env.example` to `test.env` (gitignored) and set `SHRUNK_DB_HOST="mongodb-test"`, `SHRUNK_DB_PORT="27018"`, `SHRUNK_FLASK_TESTING=1`.

```sh
# full suite (starts mongodb-test automatically)
docker-compose -f docker-compose.tests.yml run --rm backend-test
# one file or one test
docker-compose -f docker-compose.tests.yml run --rm backend-test python -m pytest tests/test_api_link.py
docker-compose -f docker-compose.tests.yml run --rm backend-test python -m pytest tests/test_api_link.py::test_name
# include slow tests
docker-compose -f docker-compose.tests.yml run --rm backend-test python -m pytest tests -m slow
# after changing backend dependencies or the Dockerfile
docker-compose -f docker-compose.tests.yml build backend-test
# stop the test Mongo when done
docker-compose -f docker-compose.tests.yml down
```
pytest defaults (from `pyproject.toml`) add `--cov=shrunk -m "not slow"`, so tests marked `@pytest.mark.slow` are skipped unless you pass `-m slow`.

### Frontend (run from `frontend/`)
```sh
npm run dev | build | type-check | lint | lint-fix
npx prettier --write .        # CI runs `npx prettier --check .`
```

## Git workflow
- The default branch is `master`. Releases happen on version branches named like `v3.2.0`.
- Feature and fix branches merge into the current version branch, not `master`. Version branches merge into `master` when a release ships. Target the version branch when opening a merge request.
- Branches created from a GitLab issue are named `<issue#>-<slug>`, e.g. `372-qr-code-creation-via-api`.
- Commit messages must follow Conventional Commits (commitlint), e.g. `feat: ...`, `fix: ...`, `chore: ...`.
- Husky hooks in `frontend/.husky` (installed by `npm install` in `frontend/`) lint and format staged files on commit.

## Architecture rules and gotchas

### Request routing
- In production, httpd (`frontend/httpd/httpd.conf`) serves the built SPA under `/app/` and proxies everything else (the API and short-link redirects) to the backend over uwsgi. In dev, `vite.config.ts` does the same proxying to `backend:3050`.
- All browser-facing backend routes go under `/api/core/...`. The public, token-authenticated API is under `/api/v1/...` (`backend/shrunk/api/v1/`). Any other path is treated as a short-link alias and resolved by `_serve_shortened_links` in `backend/shrunk/__init__.py`.

### Backend (`backend/shrunk/`)
- A new blueprint must be registered in `create_app()` in `__init__.py`.
- `api/*.py` blueprints handle HTTP and validation and call `ShrunkClient` (`current_app.client`). All Mongo access goes through the per-domain client classes in `client/`. Document shapes are TypedDicts in `mongo_schema.py`.
- `@require_login` (in `util/decorators.py`) injects `(netid, client)` as the first view arguments. Use `@request_schema(SCHEMA)` to validate JSON bodies and `@require_token(permission)` to guard `/api/v1` endpoints.
- Raise `ApiProblem(status, error_code, message, fields=...)` (`api_errors.py`) for expected, user-actionable errors. It becomes `{"error": {"code", "message", "fields"}}` for `/api/core` requests.
- Configuration comes entirely from `SHRUNK_*` environment variables (see `.env.example`). `backend/shrunk/config.py` is a legacy example file and is not loaded. Add new variables to `.env.example`.
- Production runs uwsgi with `--lazy-apps` (`entrypoint.sh`). Each worker builds its own app, so PyMongo clients must not be created at import time or shared across forks.

### Migrations
`python -m shrunk.migrate` runs on every container start, before the server. To add a migration: `uv run pymongo-migrate generate -m shrunk/migrations "description"`. Then set `dependencies` to the previous migration and make `upgrade(db)` idempotent. Never edit a migration that has already run in a shared environment. Full rules are in `backend/shrunk/migrations/README.md`.

### Frontend (`frontend/src/`)
- UI uses shadcn-style Radix primitives in `Components/ui/` plus Tailwind v4. `CONTRIBUTE.md` still mentions Ant Design, but the code no longer uses it. Use Tailwind classes rather than new CSS files or inline styles.
- Every backend call goes through `Api/Client.ts` and the per-domain modules in `Api/`. Request paths must start with `/api/core`.
- Feature flags come from the backend (`Contexts/FeatureFlags.tsx`) and are driven by `SHRUNK_*_ENABLED` env vars.
- Primary and secondary buttons use a single verb ("Edit", not "Edit Link").

## Before opening a merge request
Run `/open-mr` (Claude Code). Without it, do the same by hand:
- Run the checks for the side you changed and include the output in the MR: `ruff format --check` and `ruff check`, the relevant backend tests through Docker, and `npm run type-check` and `npm run lint` for frontend changes.
- Run `/code-review` and `/security-review`. Fix each finding, or say in the MR why it doesn't apply.
- Fill in the MR template (Testing, Risk, How to revert) and target the current version branch.
- If the same review finding keeps coming up, fix it at the source: add a rule here or to `REVIEW.md`, a lint rule, or a test.

## Reviewing
When reviewing a change, in a merge request or with `/code-review`, follow @REVIEW.md.

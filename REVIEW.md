# Review instructions

Review instructions for Shrunk. Project context, commands, and the architecture rules are in `AGENTS.md`.

## What Important means here
Reserve Important for findings that would:
- make a short link redirect to the wrong place, keep resolving after it was deleted or expired, or stop resolving when it should
- bypass an auth, role, or ownership check
- lose, corrupt, or leak data (including secrets, tokens, or NetIDs in logs or error messages)
- ship a migration that can't be rolled back safely

Treat a violation of any rule under "Architecture rules and gotchas" in `AGENTS.md` as Important. Style, naming, and refactoring suggestions are Nit at most.

## Always check
- **Auth on new routes.** Every new `/api/core` route has `@require_login`, and every new `/api/v1` route has `@require_token(permission)`. Flag any path that lets a user read or change a link, org, or access token they don't own or administer, and role checks done only on the frontend.
- **Input validation.** New JSON endpoints use `@request_schema`, and user input doesn't reach a Mongo query unvalidated.
- **URL safety.** New code paths that accept a destination URL go through the existing checks in `backend/shrunk/client/security.py` (including Google Safe Browsing when it's enabled).
- **Redirect logic.** Changes to `_serve_shortened_links` in `backend/shrunk/__init__.py` or to alias handling get a careful look at edge cases: deleted links, expired links, multiple aliases, case sensitivity.
- **Migrations.** `upgrade(db)` is idempotent, `dependencies` points to the previous migration, and no existing migration was edited. See `backend/shrunk/migrations/README.md`.
- **Tests.** A new or changed `/api/core` or `/api/v1` endpoint has a test in `backend/tests/` covering both the success path and the auth-failure path.
- **Config.** A new `SHRUNK_*` variable is added to `.env.example`.

## Evidence
- Every finding must cite a file and line, and say how the problem would actually happen. Don't infer behavior from a function or variable name.
- Label each finding Important, Nit, or Pre-existing. Pre-existing means the bug was already there and this change didn't introduce it.
- Start the summary with a count of findings ("3 findings: 1 Important, 2 Nit"). If there's nothing to fix, say so plainly.

## Cap the nits
Report at most three Nits per review.

## Do not report
- Anything ruff, Prettier, or ESLint already enforce: formatting, import order, lint rules.
- Generated or vendored files: `frontend/dist/`, `node_modules/`, `uv.lock`, `package-lock.json`, `backend/GeoLite2-City.mmdb`, `*.log`, `__pycache__/`.
- Test code in `backend/tests/` that intentionally breaks production rules, such as querying Mongo directly through the `db` fixture.

## Higher bar
In `backend/scripts/` and `database/`, only report a finding if you're near-certain and it's severe.

## Flag for a human
Say in the summary when a change touches SSO and auth (`sso.py`, `dev_logins.py`, `util/decorators.py`), access tokens, migrations, `.gitlab-ci.yml`, `frontend/httpd/`, or `shib-sp/`. Automated review is not enough for these paths.

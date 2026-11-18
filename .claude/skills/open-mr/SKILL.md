---
name: open-mr
description: Get the current branch ready and open a GitLab merge request. Runs the checks, runs code and security review, drafts the MR description from the template, and pushes.
disable-model-invocation: true
---
1. Check `git status`. If there are uncommitted changes, stop and ask what to do with them.
2. Find the target branch: the highest `vX.Y.Z` version branch (`git branch -a --list '*v[0-9]*' | sort -V`). Confirm it with the user before going further. Never target `master`.
3. Run the checks for the side the branch changed (`git diff --name-only <target>...HEAD`), and keep the output:
   - Backend: `uv run ruff format --check` and `uv run ruff check` from `backend/`, then the relevant tests through Docker as described in AGENTS.md.
   - Frontend: `npm run type-check` and `npm run lint` from `frontend/`.
   If anything fails, fix it or stop and report.
4. Run `/code-review` and `/security-review` against the target branch. Fix each finding, or note why it doesn't apply.
5. Draft the MR description from `.gitlab/merge_request_templates/Default.md`. Fill every section from what you actually did: paste real command output under Testing, and don't claim checks you didn't run. List any review findings you didn't fix and why. Show the draft to the user.
6. Once the user approves, push and open the MR:
   - If `glab` is installed: `git push -u origin HEAD`, then `glab mr create --target-branch <target> --title "<conventional-commit-style title>" --description "<draft>"`.
   - Otherwise: `git push -u origin HEAD -o merge_request.create -o merge_request.target=<target> -o merge_request.title="<title>"`, then give the user the MR link and the drafted description to paste in.

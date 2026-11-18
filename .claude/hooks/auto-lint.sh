#!/bin/bash

# Claude Code Auto-Linting Hook
# Automatically lints source code files after Claude edits them

# Extract file path using jq
file_path=$(jq -r '.tool_input.file_path')

# Exit silently if no file path found or file doesn't exist
if [ -z "$file_path" ] || [ ! -f "$file_path" ]; then
    exit 0
fi

# Project root
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"

# Get file extension
extension="${file_path##*.}"

# Format based on file extension
case "$extension" in
    # JavaScript/TypeScript files - eslint
    js|jsx|ts|tsx)
        # only lint files in frontend/, from inside frontend/ (its config + node_modules)
        if [[ "$file_path" == "$root"/frontend/* ]]; then
            cd "$root/frontend" || exit 0
            # --fix applies what it can; a non-zero exit means errors are left that it couldn't fix
            if ! output=$(npx --no-install eslint --fix "$file_path" 2>&1); then
                echo "eslint found errors it couldn't auto-fix in $file_path:" >&2
                echo "$output" >&2
                exit 2
            fi
        fi
        ;;

    # Python files - use ruff via uv tool
    py)
        # only lint files in backend/
        if [[ "$file_path" == "$root"/backend/* ]] && command -v uv &> /dev/null; then
            cd "$root/backend" || exit 0
            # --fix applies what it can; a non-zero exit means errors are left that it couldn't fix
            if ! output=$(uv run ruff check --fix "$file_path" 2>&1); then
                echo "ruff found errors it couldn't auto-fix in $file_path:" >&2
                echo "$output" >&2
                exit 2
            fi
        fi
        ;;


esac

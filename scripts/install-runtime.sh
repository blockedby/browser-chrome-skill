#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
NODE="${BROWSER_CHROME_NODE:-node}"
NPM="${BROWSER_CHROME_NPM:-npm}"

command -v "$NODE" >/dev/null || { echo "browser-chrome: Node.js is required" >&2; exit 1; }
command -v "$NPM" >/dev/null || { echo "browser-chrome: npm is required for installation" >&2; exit 1; }

# Only installation consults npm. The lockfile belongs to this skill.
(cd "$SKILL_DIR/runtime" && "$NPM" ci --no-audit --no-fund) >&2
CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS=1 "$NODE" "$SCRIPT_DIR/runtime.mjs" --version >&2

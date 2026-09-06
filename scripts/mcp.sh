#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

mode="${1:-}"
shift || true

export CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS="${CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS:-1}"
NODE="${BROWSER_CHROME_NODE:-node}"
COMMON_ARGS=("$SCRIPT_DIR/runtime.mjs" "--no-usage-statistics" "--no-performance-crux")

case "$mode" in
  headed|headed-connect|headless) ;;
  *) echo "Usage: $0 <headed|headed-connect|headless> [chrome-devtools-mcp args...]" >&2; exit 2 ;;
esac

# Fail before opening Chrome if the runtime was not installed.
if [ -n "${BROWSER_CHROME_NPX:-}" ] || [ -n "${BROWSER_CHROME_MCP_PACKAGE:-}" ]; then
  echo "browser-chrome: BROWSER_CHROME_NPX and BROWSER_CHROME_MCP_PACKAGE are no longer supported; install the pinned runtime with scripts/install-runtime.sh and remove these overrides" >&2
  exit 1
fi
"$NODE" "$SCRIPT_DIR/runtime.mjs" --check

case "$mode" in
  headed|headed-connect)
    if [ "$mode" = "headed" ]; then
      "$SCRIPT_DIR/open-headed.sh" >/dev/null
    fi
    url="$(bc_headed_url)"
    exec "$NODE" "${COMMON_ARGS[@]}" "--browser-url=$url" "$@"
    ;;
  headless)
    output="$("$SCRIPT_DIR/open-headless.sh")"
    id="$(awk '{for(i=1;i<=NF;i++){if($i ~ /^id=/){sub(/^id=/,"",$i); print $i}}}' <<<"$output" | tail -n1)"
    url="$(awk '{for(i=1;i<=NF;i++){if($i ~ /^url=/){sub(/^url=/,"",$i); print $i}}}' <<<"$output" | tail -n1)"
    if [ -z "$id" ] || [ -z "$url" ]; then
      echo "FAILED mode=headless reason=could-not-parse-open-output output=$output" >&2
      exit 1
    fi
    child=""
    cleanup() {
      if [ -n "$child" ]; then
        kill "$child" >/dev/null 2>&1 || true
        wait "$child" >/dev/null 2>&1 || true
      fi
      "$SCRIPT_DIR/close-headless.sh" "$id" >/dev/null 2>&1 || true
    }
    trap cleanup EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    # Explicit stdin is required for an asynchronous stdio MCP process.
    "$NODE" "${COMMON_ARGS[@]}" "--browser-url=$url" "$@" <&0 &
    child=$!
    status=0
    wait "$child" || status=$?
    child=""
    exit "$status"
    ;;
esac
